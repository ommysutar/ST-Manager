import type { PaymentResponseDto } from "@st-manager/contracts";

import { paymentsApi } from "@/lib/api-client";
import { isLocalProjectId, listPendingProjectCreates } from "@/lib/projects/offline-queue";
import {
  getActiveStudioId,
  isBrowserOnline,
  isRetryableSyncFailure,
  readStudioScopedItem,
  withTimeout,
  writeStudioScopedItem,
} from "@/lib/sync";

import { migrateLegacyPaymentsToStudioCache, runLegacyPaymentBackfill } from "./backfill";
import { notifyPaymentsUpdated } from "./events";
import { dtoToPaymentRecord, paymentRecordToResponseDto } from "./map-dto";
import {
  buildOptimisticPaymentRecord,
  createLocalPaymentId,
  enqueuePendingPaymentCreate,
  isLocalPaymentId,
  listPendingPaymentCreates,
  removePendingPaymentCreate,
  updatePendingPaymentCreate,
  type PendingPaymentCreatePayload,
} from "./offline-queue";
import { setPaymentsSnapshot } from "./snapshots";
import type { PaymentRecord } from "./types";

export {
  buildOptimisticPaymentRecord,
  createLocalPaymentId,
  enqueuePendingPaymentCreate,
  isLocalPaymentId,
  listPendingPaymentCreates,
  removePendingPaymentCreate,
  updatePendingPaymentCreate,
  type PendingPaymentCreatePayload,
} from "./offline-queue";

const EPOCH_ISO = "1970-01-01T00:00:00.000Z";
const REFRESH_TIMEOUT_MS = 8_000;
const CREATE_TIMEOUT_MS = 8_000;

const PAYMENTS_CACHE_KEY = "st-manager-payments-cache";
const PAYMENTS_CURSOR_KEY = "st-manager-payments-sync-cursor";
const PAYMENTS_TOMBSTONES_KEY = "st-manager-payments-tombstones";
const PROJECTS_CACHE_KEY = "st-manager-projects-cache";

let paymentsSnapshot: PaymentRecord[] = [];
let refreshPromise: Promise<PaymentRecord[]> | null = null;
let reconcilePromise: Promise<PaymentRecord[]> | null = null;
let flushPromise: Promise<void> | null = null;

const inFlightCreates = new Map<string, Promise<PaymentResponseDto>>();

type PaymentTombstones = Record<string, string>;

function createPayloadFingerprint(payload: PendingPaymentCreatePayload): string {
  return [
    payload.projectId,
    String(payload.amount),
    payload.method,
    payload.source ?? "manual",
    payload.notes ?? "",
    payload.receivedBy ?? "",
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

function resolveProjectIdForFlush(projectId: string): string | null {
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

function findDuplicateInSnapshot(
  payload: PendingPaymentCreatePayload,
  excludeLocalId?: string,
): PaymentRecord | undefined {
  return paymentsSnapshot.find((payment) => {
    if (isLocalPaymentId(payment.id) || payment.id === excludeLocalId) {
      return false;
    }
    return (
      payment.projectId === payload.projectId &&
      payment.amount === payload.amount &&
      payment.method === payload.method &&
      payment.source === (payload.source ?? "manual") &&
      payment.notes === (payload.notes ?? "") &&
      payment.receivedBy === (payload.receivedBy ?? "")
    );
  });
}

export function getPaymentsStoreSnapshot(): PaymentRecord[] {
  return paymentsSnapshot;
}

export function getPaymentFromSnapshot(paymentId: string): PaymentRecord | undefined {
  return paymentsSnapshot.find((payment) => payment.id === paymentId);
}

export function setPaymentsStoreSnapshot(next: PaymentRecord[]): PaymentRecord[] {
  paymentsSnapshot = next;
  setPaymentsSnapshot(next);
  return paymentsSnapshot;
}

function sortPayments(payments: PaymentRecord[]): PaymentRecord[] {
  return [...payments].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function readTombstones(studioId: string | null = getActiveStudioId()): PaymentTombstones {
  if (!studioId) return {};
  try {
    const raw = readStudioScopedItem(PAYMENTS_TOMBSTONES_KEY, studioId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PaymentTombstones;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTombstones(
  tombstones: PaymentTombstones,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(PAYMENTS_TOMBSTONES_KEY, JSON.stringify(tombstones), studioId);
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

function readCachedPayments(studioId: string | null = getActiveStudioId()): PaymentRecord[] {
  if (!studioId) return [];
  try {
    const raw = readStudioScopedItem(PAYMENTS_CACHE_KEY, studioId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PaymentRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedPayments(
  payments: PaymentRecord[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(PAYMENTS_CACHE_KEY, JSON.stringify(payments), studioId);
}

export function readPaymentsSyncCursor(studioId: string | null = getActiveStudioId()): string | null {
  if (!studioId) return null;
  return readStudioScopedItem(PAYMENTS_CURSOR_KEY, studioId);
}

export function writePaymentsSyncCursor(
  cursor: string,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(PAYMENTS_CURSOR_KEY, cursor, studioId);
}

export function hydratePaymentsSnapshotFromCache(): PaymentRecord[] {
  migrateLegacyPaymentsToStudioCache();

  const tombstones = readTombstones();
  const cached = readCachedPayments().filter((payment) => !tombstones[payment.id]);
  const pending = listPendingPaymentCreates().map((entry) =>
    buildOptimisticPaymentRecord(entry.localId, entry.payload),
  );
  const byId = new Map<string, PaymentRecord>();
  for (const payment of [...cached, ...pending]) {
    if (tombstones[payment.id] && !isLocalPaymentId(payment.id)) {
      continue;
    }
    byId.set(payment.id, payment);
  }
  setPaymentsStoreSnapshot(sortPayments([...byId.values()]));
  notifyPaymentsUpdated();
  return paymentsSnapshot;
}

export async function loadProductionPayments(): Promise<PaymentResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: PaymentResponseDto[] = [];

  while (page <= 20) {
    const response = await paymentsApi.listPayments({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  return all.filter((payment) => !payment.deletedAt);
}

export function applyPaymentChangeRecords(records: PaymentResponseDto[]): PaymentRecord[] {
  const byId = new Map(paymentsSnapshot.map((payment) => [payment.id, payment]));
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
    const remotePayment = dtoToPaymentRecord(remote);
    if (!local) {
      byId.set(remote.id, remotePayment);
      continue;
    }

    const localMs = Date.parse(local.createdAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remotePayment);
    }
  }

  writeTombstones(tombstones);
  const next = sortPayments(
    [...byId.values()].filter((payment) => isLocalPaymentId(payment.id) || !tombstones[payment.id]),
  );
  setPaymentsStoreSnapshot(next);
  writeCachedPayments(next);
  return next;
}

export function applyAuthoritativeActivePaymentList(
  remoteActive: PaymentResponseDto[],
  candidateIdsToTombstone?: ReadonlySet<string>,
): PaymentRecord[] {
  const tombstones = readTombstones();
  const remoteIds = new Set(remoteActive.map((payment) => payment.id));
  const now = new Date().toISOString();
  const byId = new Map(paymentsSnapshot.map((payment) => [payment.id, payment]));
  const mayTombstone = (id: string) =>
    !candidateIdsToTombstone || candidateIdsToTombstone.has(id);

  for (const payment of [...byId.values()]) {
    if (isLocalPaymentId(payment.id)) {
      continue;
    }
    if (!remoteIds.has(payment.id) && mayTombstone(payment.id)) {
      tombstones[payment.id] = tombstones[payment.id] ?? now;
      byId.delete(payment.id);
    }
  }

  for (const remote of remoteActive) {
    if (remote.deletedAt) {
      continue;
    }
    delete tombstones[remote.id];
    const remotePayment = dtoToPaymentRecord(remote);
    const local = byId.get(remote.id);
    if (!local) {
      byId.set(remote.id, remotePayment);
      continue;
    }
    const localMs = Date.parse(local.createdAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remotePayment);
    }
  }

  writeTombstones(tombstones);
  const next = sortPayments(
    [...byId.values()].filter((payment) => isLocalPaymentId(payment.id) || !tombstones[payment.id]),
  );
  setPaymentsStoreSnapshot(next);
  writeCachedPayments(next);
  return next;
}

function serverIdsInSnapshot(): Set<string> {
  return new Set(
    paymentsSnapshot.filter((payment) => !isLocalPaymentId(payment.id)).map((payment) => payment.id),
  );
}

export async function refreshPaymentsSnapshot(): Promise<PaymentRecord[]> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const knownIdsBeforeFetch = serverIdsInSnapshot();

  refreshPromise = withTimeout(loadProductionPayments(), REFRESH_TIMEOUT_MS)
    .then((payments) => {
      const pendingLocals = paymentsSnapshot.filter((payment) => isLocalPaymentId(payment.id));
      const byId = new Map(payments.map((payment) => [payment.id, dtoToPaymentRecord(payment)]));
      for (const local of pendingLocals) {
        byId.set(local.id, local);
      }
      for (const current of paymentsSnapshot) {
        if (
          !isLocalPaymentId(current.id) &&
          !knownIdsBeforeFetch.has(current.id) &&
          !byId.has(current.id)
        ) {
          byId.set(current.id, current);
        }
      }

      const tombstones = readTombstones();
      const now = new Date().toISOString();
      const remoteIds = new Set(payments.map((payment) => payment.id));
      for (const priorId of knownIdsBeforeFetch) {
        if (!remoteIds.has(priorId)) {
          tombstones[priorId] = tombstones[priorId] ?? now;
        }
      }
      for (const payment of payments) {
        delete tombstones[payment.id];
      }
      writeTombstones(tombstones);

      const next = sortPayments(
        [...byId.values()].filter(
          (payment) => isLocalPaymentId(payment.id) || !tombstones[payment.id],
        ),
      );
      setPaymentsStoreSnapshot(next);
      writeCachedPayments(next);
      writePaymentsSyncCursor(latestTimestamp(payments.map((payment) => payment.updatedAt)));
      return next;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function reconcilePaymentsFromApi(): Promise<PaymentRecord[]> {
  if (reconcilePromise) {
    return reconcilePromise;
  }

  reconcilePromise = (async () => {
    const studioId = getActiveStudioId();
    if (!studioId) {
      return paymentsSnapshot;
    }

    if (!isBrowserOnline()) {
      hydratePaymentsSnapshotFromCache();
      return paymentsSnapshot;
    }

    if (paymentsSnapshot.length === 0) {
      hydratePaymentsSnapshotFromCache();
    }

    const cursor = readPaymentsSyncCursor(studioId);
    if (!cursor) {
      const full = await refreshPaymentsSnapshot();
      await flushPendingPaymentCreates();
      await runLegacyPaymentBackfill(paymentsSnapshot);
      notifyPaymentsUpdated();
      return full;
    }

    let since = cursor;
    let hasMore = true;
    while (hasMore) {
      const page = await withTimeout(paymentsApi.pullPaymentChanges({ since }), REFRESH_TIMEOUT_MS);
      if (page.records.length > 0) {
        applyPaymentChangeRecords(page.records);
      }
      const parsedServer = Date.parse(page.serverTime);
      const parsedSince = Date.parse(since);
      const nextCursor =
        !Number.isNaN(parsedServer) && (Number.isNaN(parsedSince) || parsedServer >= parsedSince)
          ? page.serverTime
          : since;
      writePaymentsSyncCursor(nextCursor, studioId);
      since = nextCursor;
      hasMore = page.hasMore;
    }

    const knownIdsBeforeList = serverIdsInSnapshot();
    applyAuthoritativeActivePaymentList(
      await withTimeout(loadProductionPayments(), REFRESH_TIMEOUT_MS),
      knownIdsBeforeList,
    );

    await flushPendingPaymentCreates();
    await runLegacyPaymentBackfill(paymentsSnapshot);
    notifyPaymentsUpdated();
    return paymentsSnapshot;
  })().finally(() => {
    reconcilePromise = null;
  });

  return reconcilePromise;
}

export function upsertPaymentInSnapshot(payment: PaymentRecord): void {
  const tomb = readTombstones()[payment.id];
  if (tomb && !isLocalPaymentId(payment.id)) {
    const tombMs = Date.parse(tomb);
    const paymentMs = Date.parse(payment.createdAt);
    if (!Number.isNaN(tombMs) && (Number.isNaN(paymentMs) || paymentMs <= tombMs)) {
      return;
    }
    const tombstones = readTombstones();
    delete tombstones[payment.id];
    writeTombstones(tombstones);
  }

  const next = sortPayments([
    payment,
    ...paymentsSnapshot.filter((entry) => entry.id !== payment.id),
  ]);
  setPaymentsStoreSnapshot(next);
  writeCachedPayments(next);
}

export function removePaymentFromSnapshot(paymentId: string): void {
  const next = paymentsSnapshot.filter((payment) => payment.id !== paymentId);
  setPaymentsStoreSnapshot(next);
  writeCachedPayments(next);
  const tombstones = readTombstones();
  tombstones[paymentId] = new Date().toISOString();
  writeTombstones(tombstones);
}

export function remapLocalPaymentIdInSnapshot(
  localId: string,
  serverPayment: PaymentResponseDto,
): void {
  const serverRecord = dtoToPaymentRecord(serverPayment);
  const withoutLocal = paymentsSnapshot.filter(
    (payment) => payment.id !== localId && payment.id !== serverPayment.id,
  );
  setPaymentsStoreSnapshot(sortPayments([serverRecord, ...withoutLocal]));
  writeCachedPayments(paymentsSnapshot);
  removePendingPaymentCreate(localId);
  notifyPaymentsUpdated();
}

function enqueueOptimisticCreate(
  studioId: string,
  payload: PendingPaymentCreatePayload,
): PaymentRecord {
  const localId = createLocalPaymentId();
  const optimistic = buildOptimisticPaymentRecord(localId, payload);
  enqueuePendingPaymentCreate({
    localId,
    studioId,
    payload,
    enqueuedAt: new Date().toISOString(),
  });
  upsertPaymentInSnapshot(optimistic);
  notifyPaymentsUpdated();
  return optimistic;
}

export async function createPaymentOfflineAware(
  payload: PendingPaymentCreatePayload,
): Promise<PaymentRecord> {
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

  const fingerprint = createPayloadFingerprint(payload);
  const inflight = inFlightCreates.get(fingerprint);
  if (inflight) {
    const created = await inflight;
    return dtoToPaymentRecord(created);
  }

  const request = paymentsApi.createPayment(payload);
  void request.catch(() => undefined);
  inFlightCreates.set(fingerprint, request);

  const createPromise = (async () => {
    try {
      const created = await withTimeout(request, CREATE_TIMEOUT_MS);
      const payment = dtoToPaymentRecord(created);
      upsertPaymentInSnapshot(payment);
      notifyPaymentsUpdated();
      return payment;
    } catch (error) {
      if (!isRetryableSyncFailure(error)) {
        throw error;
      }
      const optimistic = enqueueOptimisticCreate(studioId, payload);
      void request
        .then((created) => {
          updatePendingPaymentCreate(optimistic.id, { serverId: created.id }, studioId);
          remapLocalPaymentIdInSnapshot(optimistic.id, created);
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

export async function flushPendingPaymentCreates(): Promise<void> {
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

    const pending = listPendingPaymentCreates(studioId);
    for (const entry of pending) {
      try {
        const resolvedProjectId = resolveProjectIdForFlush(entry.payload.projectId);
        if (!resolvedProjectId) {
          continue;
        }

        const payload =
          resolvedProjectId === entry.payload.projectId
            ? entry.payload
            : { ...entry.payload, projectId: resolvedProjectId };

        const fingerprint = createPayloadFingerprint(payload);
        const inflight = inFlightCreates.get(fingerprint);
        if (inflight) {
          try {
            const created = await inflight;
            updatePendingPaymentCreate(entry.localId, { serverId: created.id }, studioId);
            remapLocalPaymentIdInSnapshot(entry.localId, created);
          } catch {
            // Original POST still failing — keep queued.
          }
          continue;
        }

        if (entry.serverId) {
          const existing = paymentsSnapshot.find((payment) => payment.id === entry.serverId);
          if (existing) {
            remapLocalPaymentIdInSnapshot(
              entry.localId,
              paymentRecordToResponseDto(existing, studioId),
            );
            continue;
          }
          try {
            const fetched = await paymentsApi.getPayment(entry.serverId);
            remapLocalPaymentIdInSnapshot(entry.localId, fetched);
            continue;
          } catch {
            // Fall through and recreate if the remembered server id is gone.
          }
        }

        const duplicate = findDuplicateInSnapshot(payload, entry.localId);
        if (duplicate) {
          updatePendingPaymentCreate(entry.localId, { serverId: duplicate.id }, studioId);
          remapLocalPaymentIdInSnapshot(
            entry.localId,
            paymentRecordToResponseDto(duplicate, studioId),
          );
          continue;
        }

        const created = await withTimeout(paymentsApi.createPayment(payload), CREATE_TIMEOUT_MS);
        updatePendingPaymentCreate(entry.localId, { serverId: created.id }, studioId);
        remapLocalPaymentIdInSnapshot(entry.localId, created);
      } catch {
        // Leave in queue for the next online/focus reconcile.
      }
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}
