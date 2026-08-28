import type { StudioDocumentResponseDto } from "@st-manager/contracts";

import { studioDocumentsApi } from "@/lib/api-client";
import { isLocalPaymentId, listPendingPaymentCreates } from "@/lib/payments/offline-queue";
import { isLocalProjectId, listPendingProjectCreates } from "@/lib/projects/offline-queue";
import {
  getActiveStudioId,
  isBrowserOnline,
  isRetryableSyncFailure,
  readStudioScopedItem,
  withTimeout,
  writeStudioScopedItem,
} from "@/lib/sync";

import { migrateLegacyDocumentsToStudioCache, runLegacyDocumentBackfill } from "./backfill";
import { notifyDocumentsUpdated } from "./events";
import { dtoToStudioDocument, studioDocumentToResponseDto } from "./map-dto";
import {
  buildOptimisticStudioDocument,
  createLocalDocumentId,
  enqueuePendingDocumentCreate,
  isLocalDocumentId,
  listPendingDocumentCreates,
  removePendingDocumentCreate,
  updatePendingDocumentCreate,
  type PendingDocumentCreatePayload,
} from "./offline-queue";
import { setDocumentsSnapshot } from "./snapshots";
import type { StudioDocument } from "./types";

export {
  buildOptimisticStudioDocument,
  createLocalDocumentId,
  enqueuePendingDocumentCreate,
  isLocalDocumentId,
  listPendingDocumentCreates,
  removePendingDocumentCreate,
  updatePendingDocumentCreate,
  type PendingDocumentCreatePayload,
} from "./offline-queue";

const EPOCH_ISO = "1970-01-01T00:00:00.000Z";
const REFRESH_TIMEOUT_MS = 8_000;
const CREATE_TIMEOUT_MS = 8_000;

const DOCUMENTS_CACHE_KEY = "st-manager-documents-cache";
const DOCUMENTS_CURSOR_KEY = "st-manager-documents-sync-cursor";
const DOCUMENTS_TOMBSTONES_KEY = "st-manager-documents-tombstones";
const PROJECTS_CACHE_KEY = "st-manager-projects-cache";
const PAYMENTS_CACHE_KEY = "st-manager-payments-cache";

let documentsSnapshot: StudioDocument[] = [];
let refreshPromise: Promise<StudioDocument[]> | null = null;
let reconcilePromise: Promise<StudioDocument[]> | null = null;
let flushPromise: Promise<void> | null = null;

const inFlightCreates = new Map<string, Promise<StudioDocumentResponseDto>>();

type DocumentTombstones = Record<string, string>;

function createPayloadFingerprint(payload: PendingDocumentCreatePayload): string {
  return [
    payload.type,
    payload.inquiryId ?? "",
    payload.projectId ?? "",
    payload.paymentId ?? "",
  ].join("|");
}

function getProjectFromCache(projectId: string): { id: string } | undefined {
  const studioId = getActiveStudioId();
  if (!studioId) return undefined;
  try {
    const raw = readStudioScopedItem(PROJECTS_CACHE_KEY, studioId);
    if (!raw) return undefined;
    const projects = JSON.parse(raw) as Array<{ id: string }>;
    return projects.find((project) => project.id === projectId);
  } catch {
    return undefined;
  }
}

function getPaymentFromCache(paymentId: string): { id: string } | undefined {
  const studioId = getActiveStudioId();
  if (!studioId) return undefined;
  try {
    const raw = readStudioScopedItem(PAYMENTS_CACHE_KEY, studioId);
    if (!raw) return undefined;
    const payments = JSON.parse(raw) as Array<{ id: string }>;
    return payments.find((payment) => payment.id === paymentId);
  } catch {
    return undefined;
  }
}

function resolveProjectIdForFlush(projectId: string | null | undefined): string | null {
  if (!projectId) {
    return null;
  }
  if (!isLocalProjectId(projectId)) {
    return projectId;
  }

  const project = getProjectFromCache(projectId);
  if (project && !isLocalProjectId(project.id)) {
    return project.id;
  }

  const pending = listPendingProjectCreates().find((entry) => entry.localId === projectId);
  if (pending?.serverId) {
    return pending.serverId;
  }

  return null;
}

function resolvePaymentIdForFlush(paymentId: string | null | undefined): string | null {
  if (!paymentId) {
    return null;
  }
  if (!isLocalPaymentId(paymentId)) {
    return paymentId;
  }

  const payment = getPaymentFromCache(paymentId);
  if (payment && !isLocalPaymentId(payment.id)) {
    return payment.id;
  }

  const pending = listPendingPaymentCreates().find((entry) => entry.localId === paymentId);
  if (pending?.serverId) {
    return pending.serverId;
  }

  return null;
}

function findDuplicateInSnapshot(
  payload: PendingDocumentCreatePayload,
  excludeLocalId?: string,
): StudioDocument | undefined {
  return documentsSnapshot.find((document) => {
    if (isLocalDocumentId(document.id) || document.id === excludeLocalId) {
      return false;
    }
    if (document.type !== payload.type) {
      return false;
    }
    if (payload.type === "receipt") {
      return Boolean(payload.paymentId && document.paymentId === payload.paymentId);
    }
    if (payload.type === "invoice") {
      return Boolean(payload.projectId && document.projectId === payload.projectId);
    }
    if (payload.inquiryId && document.inquiryId === payload.inquiryId) {
      return true;
    }
    return Boolean(payload.projectId && document.projectId === payload.projectId);
  });
}

export function getDocumentsStoreSnapshot(): StudioDocument[] {
  return documentsSnapshot;
}

export function getDocumentFromSnapshot(documentId: string): StudioDocument | undefined {
  return documentsSnapshot.find((document) => document.id === documentId);
}

export function setDocumentsStoreSnapshot(next: StudioDocument[]): StudioDocument[] {
  documentsSnapshot = next;
  setDocumentsSnapshot(next);
  return documentsSnapshot;
}

function sortDocuments(documents: StudioDocument[]): StudioDocument[] {
  return [...documents].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function readTombstones(studioId: string | null = getActiveStudioId()): DocumentTombstones {
  if (!studioId) return {};
  try {
    const raw = readStudioScopedItem(DOCUMENTS_TOMBSTONES_KEY, studioId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DocumentTombstones;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTombstones(
  tombstones: DocumentTombstones,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(DOCUMENTS_TOMBSTONES_KEY, JSON.stringify(tombstones), studioId);
}

function latestTimestamp(values: Array<string | null | undefined>): string {
  let max = 0;
  let iso = EPOCH_ISO;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isNaN(ms) && ms >= max) {
      max = ms;
      iso = value;
    }
  }
  return iso;
}

function readCachedDocuments(studioId: string | null = getActiveStudioId()): StudioDocument[] {
  if (!studioId) return [];
  try {
    const raw = readStudioScopedItem(DOCUMENTS_CACHE_KEY, studioId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioDocument[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedDocuments(
  documents: StudioDocument[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(DOCUMENTS_CACHE_KEY, JSON.stringify(documents), studioId);
}

export function readDocumentsSyncCursor(studioId: string | null = getActiveStudioId()): string | null {
  if (!studioId) return null;
  return readStudioScopedItem(DOCUMENTS_CURSOR_KEY, studioId);
}

export function writeDocumentsSyncCursor(
  cursor: string,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(DOCUMENTS_CURSOR_KEY, cursor, studioId);
}

export function hydrateDocumentsSnapshotFromCache(): StudioDocument[] {
  migrateLegacyDocumentsToStudioCache();

  const tombstones = readTombstones();
  const cached = readCachedDocuments().filter((document) => !tombstones[document.id]);
  const pending = listPendingDocumentCreates().map((entry) =>
    buildOptimisticStudioDocument(entry.localId, entry.payload),
  );
  const byId = new Map<string, StudioDocument>();
  for (const document of [...cached, ...pending]) {
    if (tombstones[document.id] && !isLocalDocumentId(document.id)) {
      continue;
    }
    byId.set(document.id, document);
  }
  setDocumentsStoreSnapshot(sortDocuments([...byId.values()]));
  notifyDocumentsUpdated();
  return documentsSnapshot;
}

export async function loadProductionDocuments(): Promise<StudioDocumentResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: StudioDocumentResponseDto[] = [];

  while (page <= 20) {
    const response = await studioDocumentsApi.listStudioDocuments({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  return all.filter((document) => !document.deletedAt);
}

export function applyStudioDocumentChangeRecords(
  records: StudioDocumentResponseDto[],
): StudioDocument[] {
  const byId = new Map(documentsSnapshot.map((document) => [document.id, document]));
  const tombstones = readTombstones();

  for (const remote of records) {
    if (remote.deletedAt) {
      const deletedMs = Date.parse(remote.deletedAt);
      const existingTomb = tombstones[remote.id];
      const existingMs = existingTomb ? Date.parse(existingTomb) : 0;
      if (Number.isNaN(deletedMs) || deletedMs >= existingMs) {
        tombstones[remote.id] = remote.deletedAt;
      }
      byId.delete(remote.id);
      continue;
    }

    const tomb = tombstones[remote.id];
    if (tomb) {
      const tombMs = Date.parse(tomb);
      const remoteMs = Date.parse(remote.updatedAt);
      if (!Number.isNaN(tombMs) && (Number.isNaN(remoteMs) || remoteMs <= tombMs)) {
        continue;
      }
      delete tombstones[remote.id];
    }

    const local = byId.get(remote.id);
    const remoteDocument = dtoToStudioDocument(remote);
    if (!local) {
      byId.set(remote.id, remoteDocument);
      continue;
    }

    const localMs = Date.parse(local.createdAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remoteDocument);
    }
  }

  writeTombstones(tombstones);
  const next = sortDocuments(
    [...byId.values()].filter(
      (document) => isLocalDocumentId(document.id) || !tombstones[document.id],
    ),
  );
  setDocumentsStoreSnapshot(next);
  writeCachedDocuments(next);
  return next;
}

export function applyAuthoritativeActiveDocumentList(
  remoteActive: StudioDocumentResponseDto[],
  candidateIdsToTombstone?: ReadonlySet<string>,
): StudioDocument[] {
  const tombstones = readTombstones();
  const remoteIds = new Set(remoteActive.map((document) => document.id));
  const now = new Date().toISOString();
  const byId = new Map(documentsSnapshot.map((document) => [document.id, document]));
  const mayTombstone = (id: string) =>
    !candidateIdsToTombstone || candidateIdsToTombstone.has(id);

  for (const document of [...byId.values()]) {
    if (isLocalDocumentId(document.id)) {
      continue;
    }
    if (!remoteIds.has(document.id) && mayTombstone(document.id)) {
      tombstones[document.id] = tombstones[document.id] ?? now;
      byId.delete(document.id);
    }
  }

  for (const remote of remoteActive) {
    if (remote.deletedAt) {
      continue;
    }
    delete tombstones[remote.id];
    const remoteDocument = dtoToStudioDocument(remote);
    const local = byId.get(remote.id);
    if (!local) {
      byId.set(remote.id, remoteDocument);
      continue;
    }
    const localMs = Date.parse(local.createdAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remoteDocument);
    }
  }

  writeTombstones(tombstones);
  const next = sortDocuments(
    [...byId.values()].filter(
      (document) => isLocalDocumentId(document.id) || !tombstones[document.id],
    ),
  );
  setDocumentsStoreSnapshot(next);
  writeCachedDocuments(next);
  return next;
}

function serverIdsInSnapshot(): Set<string> {
  return new Set(
    documentsSnapshot
      .filter((document) => !isLocalDocumentId(document.id))
      .map((document) => document.id),
  );
}

export async function refreshDocumentsSnapshot(): Promise<StudioDocument[]> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const knownIdsBeforeFetch = serverIdsInSnapshot();

  refreshPromise = withTimeout(loadProductionDocuments(), REFRESH_TIMEOUT_MS)
    .then((documents) => {
      const pendingLocals = documentsSnapshot.filter((document) => isLocalDocumentId(document.id));
      const byId = new Map(documents.map((document) => [document.id, dtoToStudioDocument(document)]));
      for (const local of pendingLocals) {
        byId.set(local.id, local);
      }
      for (const current of documentsSnapshot) {
        if (
          !isLocalDocumentId(current.id) &&
          !knownIdsBeforeFetch.has(current.id) &&
          !byId.has(current.id)
        ) {
          byId.set(current.id, current);
        }
      }

      const tombstones = readTombstones();
      const now = new Date().toISOString();
      const remoteIds = new Set(documents.map((document) => document.id));
      for (const priorId of knownIdsBeforeFetch) {
        if (!remoteIds.has(priorId)) {
          tombstones[priorId] = tombstones[priorId] ?? now;
        }
      }
      for (const document of documents) {
        delete tombstones[document.id];
      }
      writeTombstones(tombstones);

      const next = sortDocuments(
        [...byId.values()].filter(
          (document) => isLocalDocumentId(document.id) || !tombstones[document.id],
        ),
      );
      setDocumentsStoreSnapshot(next);
      writeCachedDocuments(next);
      writeDocumentsSyncCursor(latestTimestamp(documents.map((document) => document.updatedAt)));
      return next;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function reconcileDocumentsFromApi(): Promise<StudioDocument[]> {
  if (reconcilePromise) {
    return reconcilePromise;
  }

  reconcilePromise = (async () => {
    const studioId = getActiveStudioId();
    if (!studioId) {
      return documentsSnapshot;
    }

    if (!isBrowserOnline()) {
      hydrateDocumentsSnapshotFromCache();
      return documentsSnapshot;
    }

    if (documentsSnapshot.length === 0) {
      hydrateDocumentsSnapshotFromCache();
    }

    const cursor = readDocumentsSyncCursor(studioId);
    if (!cursor) {
      const full = await refreshDocumentsSnapshot();
      await flushPendingDocumentCreates();
      await runLegacyDocumentBackfill(documentsSnapshot);
      notifyDocumentsUpdated();
      return full;
    }

    let since = cursor;
    let hasMore = true;
    while (hasMore) {
      const page = await withTimeout(
        studioDocumentsApi.pullStudioDocumentChanges({ since }),
        REFRESH_TIMEOUT_MS,
      );
      if (page.records.length > 0) {
        applyStudioDocumentChangeRecords(page.records);
      }
      const parsedServer = Date.parse(page.serverTime);
      const parsedSince = Date.parse(since);
      const nextCursor =
        !Number.isNaN(parsedServer) && (Number.isNaN(parsedSince) || parsedServer >= parsedSince)
          ? page.serverTime
          : since;
      writeDocumentsSyncCursor(nextCursor, studioId);
      since = nextCursor;
      hasMore = page.hasMore;
    }

    const knownIdsBeforeList = serverIdsInSnapshot();
    applyAuthoritativeActiveDocumentList(
      await withTimeout(loadProductionDocuments(), REFRESH_TIMEOUT_MS),
      knownIdsBeforeList,
    );

    await flushPendingDocumentCreates();
    await runLegacyDocumentBackfill(documentsSnapshot);
    notifyDocumentsUpdated();
    return documentsSnapshot;
  })().finally(() => {
    reconcilePromise = null;
  });

  return reconcilePromise;
}

export function upsertDocumentInSnapshot(document: StudioDocument): void {
  const tomb = readTombstones()[document.id];
  if (tomb && !isLocalDocumentId(document.id)) {
    const tombMs = Date.parse(tomb);
    const documentMs = Date.parse(document.createdAt);
    if (!Number.isNaN(tombMs) && (Number.isNaN(documentMs) || documentMs <= tombMs)) {
      return;
    }
    const tombstones = readTombstones();
    delete tombstones[document.id];
    writeTombstones(tombstones);
  }

  const next = sortDocuments([
    document,
    ...documentsSnapshot.filter((entry) => entry.id !== document.id),
  ]);
  setDocumentsStoreSnapshot(next);
  writeCachedDocuments(next);
}

export function removeDocumentFromSnapshot(documentId: string): void {
  const next = documentsSnapshot.filter((document) => document.id !== documentId);
  setDocumentsStoreSnapshot(next);
  writeCachedDocuments(next);
  const tombstones = readTombstones();
  tombstones[documentId] = new Date().toISOString();
  writeTombstones(tombstones);
}

export function remapLocalDocumentIdInSnapshot(
  localId: string,
  serverDocument: StudioDocumentResponseDto,
): void {
  const serverRecord = dtoToStudioDocument(serverDocument);
  const withoutLocal = documentsSnapshot.filter(
    (document) => document.id !== localId && document.id !== serverDocument.id,
  );
  setDocumentsStoreSnapshot(sortDocuments([serverRecord, ...withoutLocal]));
  writeCachedDocuments(documentsSnapshot);
  removePendingDocumentCreate(localId);
  notifyDocumentsUpdated();
}

function enqueueOptimisticCreate(
  studioId: string,
  payload: PendingDocumentCreatePayload,
): StudioDocument {
  const localId = createLocalDocumentId();
  const optimistic = buildOptimisticStudioDocument(localId, payload);
  enqueuePendingDocumentCreate({
    localId,
    studioId,
    payload,
    enqueuedAt: new Date().toISOString(),
  });
  upsertDocumentInSnapshot(optimistic);
  notifyDocumentsUpdated();
  return optimistic;
}

function resolvePayloadForFlush(payload: PendingDocumentCreatePayload): PendingDocumentCreatePayload | null {
  const resolvedProjectId = payload.projectId
    ? resolveProjectIdForFlush(payload.projectId)
    : null;
  if (payload.projectId && !resolvedProjectId) {
    return null;
  }

  const resolvedPaymentId = payload.paymentId
    ? resolvePaymentIdForFlush(payload.paymentId)
    : null;
  if (payload.paymentId && !resolvedPaymentId) {
    return null;
  }

  return {
    ...payload,
    projectId: resolvedProjectId ?? payload.projectId ?? null,
    paymentId: resolvedPaymentId ?? payload.paymentId ?? null,
  };
}

export async function createDocumentOfflineAware(
  payload: PendingDocumentCreatePayload,
): Promise<StudioDocument> {
  const studioId = getActiveStudioId();
  if (!studioId) {
    throw new Error("Studio context required");
  }

  const duplicate = findDuplicateInSnapshot(payload);
  if (duplicate) {
    return duplicate;
  }

  if (!isBrowserOnline()) {
    return enqueueOptimisticCreate(studioId, payload);
  }

  const resolvedPayload = resolvePayloadForFlush(payload);
  if (!resolvedPayload) {
    return enqueueOptimisticCreate(studioId, payload);
  }

  const fingerprint = createPayloadFingerprint(resolvedPayload);
  const inflight = inFlightCreates.get(fingerprint);
  if (inflight) {
    const created = await inflight;
    return dtoToStudioDocument(created);
  }

  const request = studioDocumentsApi.createStudioDocument(resolvedPayload);
  void request.catch(() => undefined);
  inFlightCreates.set(fingerprint, request);

  const createPromise = (async () => {
    try {
      const created = await withTimeout(request, CREATE_TIMEOUT_MS);
      const document = dtoToStudioDocument(created);
      upsertDocumentInSnapshot(document);
      notifyDocumentsUpdated();
      return document;
    } catch (error) {
      if (!isRetryableSyncFailure(error)) {
        throw error;
      }
      const optimistic = enqueueOptimisticCreate(studioId, payload);
      void request
        .then((created) => {
          updatePendingDocumentCreate(optimistic.id, { serverId: created.id }, studioId);
          remapLocalDocumentIdInSnapshot(optimistic.id, created);
        })
        .catch(() => {
          // Leave queued for flush if the original POST never landed.
        });
      return optimistic;
    }
  })();

  void request.finally(() => {
    inFlightCreates.delete(fingerprint);
  });

  return createPromise;
}

export async function flushPendingDocumentCreates(): Promise<void> {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    const studioId = getActiveStudioId();
    if (!studioId) {
      return;
    }

    await (await import("@/lib/projects/store")).flushPendingProjectCreates();
    await (await import("@/lib/payments/store")).flushPendingPaymentCreates();

    const pending = listPendingDocumentCreates(studioId);
    for (const entry of pending) {
      try {
        const resolvedPayload = resolvePayloadForFlush(entry.payload);
        if (!resolvedPayload) {
          continue;
        }

        const fingerprint = createPayloadFingerprint(resolvedPayload);
        const inflight = inFlightCreates.get(fingerprint);
        if (inflight) {
          try {
            const created = await inflight;
            updatePendingDocumentCreate(entry.localId, { serverId: created.id }, studioId);
            remapLocalDocumentIdInSnapshot(entry.localId, created);
          } catch {
            // Original POST still failing — keep queued.
          }
          continue;
        }

        if (entry.serverId) {
          const existing = documentsSnapshot.find((document) => document.id === entry.serverId);
          if (existing) {
            remapLocalDocumentIdInSnapshot(
              entry.localId,
              studioDocumentToResponseDto(existing, studioId),
            );
            continue;
          }
          try {
            const fetched = await studioDocumentsApi.getStudioDocument(entry.serverId);
            remapLocalDocumentIdInSnapshot(entry.localId, fetched);
            continue;
          } catch {
            // Fall through and recreate if the remembered server id is gone.
          }
        }

        const duplicate = findDuplicateInSnapshot(resolvedPayload, entry.localId);
        if (duplicate) {
          updatePendingDocumentCreate(entry.localId, { serverId: duplicate.id }, studioId);
          remapLocalDocumentIdInSnapshot(
            entry.localId,
            studioDocumentToResponseDto(duplicate, studioId),
          );
          continue;
        }

        const created = await withTimeout(
          studioDocumentsApi.createStudioDocument(resolvedPayload),
          CREATE_TIMEOUT_MS,
        );
        updatePendingDocumentCreate(entry.localId, { serverId: created.id }, studioId);
        remapLocalDocumentIdInSnapshot(entry.localId, created);
      } catch {
        // Leave in queue for the next online/focus reconcile.
      }
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}
