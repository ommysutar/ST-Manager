import type { StudioDocumentResponseDto } from "@st-manager/contracts";

import { studioDocumentsApi } from "@/lib/api-client";
import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";
import { isBrowserOnline } from "@/lib/sync";

import { studioDocumentToCreateDto } from "./map-dto";
import { isLocalDocumentId } from "./offline-queue";
import type { StudioDocument } from "./types";
import { DOCUMENTS_STORAGE_KEY } from "./types";

const DOCUMENTS_CACHE_KEY = "st-manager-documents-cache";
const BACKFILL_REPORT_KEY = "st-manager-documents-backfill-report";

/** Legacy browser-generated ids (`doc_*`), not offline queue (`local_doc_*`) or server cuid. */
export function isLegacyLocalDocumentId(id: string): boolean {
  return id.startsWith("doc_") && !isLocalDocumentId(id);
}

function isLikelyServerDocumentId(id: string): boolean {
  return !isLocalDocumentId(id) && !isLegacyLocalDocumentId(id);
}

export interface LegacyDocumentBackfillReport {
  generatedAt: string;
  studioId: string;
  migratedFromLegacyStorage: boolean;
  legacyCandidates: number;
  uploaded: number;
  skipped: number;
}

function persistBackfillReport(report: LegacyDocumentBackfillReport): void {
  const studioId = getActiveStudioId();
  if (!studioId) return;
  writeStudioScopedItem(BACKFILL_REPORT_KEY, JSON.stringify(report), studioId);
}

/**
 * Idempotent migration from global `st-manager-documents` localStorage into the
 * active studio cache. Safe to call on every hydrate.
 */
export function migrateLegacyDocumentsToStudioCache(): boolean {
  const studioId = getActiveStudioId();
  if (!studioId || typeof window === "undefined") {
    return false;
  }
  if (readStudioScopedItem(DOCUMENTS_CACHE_KEY, studioId)) {
    return false;
  }
  try {
    const legacy = window.localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    if (!legacy) {
      return false;
    }
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed)) {
      writeStudioScopedItem(DOCUMENTS_CACHE_KEY, legacy, studioId);
      return true;
    }
  } catch {
    // ignore corrupt legacy cache
  }
  return false;
}

function findServerMatch(
  local: StudioDocument,
  serverDocuments: StudioDocumentResponseDto[],
): StudioDocumentResponseDto | undefined {
  const localMs = Date.parse(local.createdAt);
  return serverDocuments.find((document) => {
    if (document.deletedAt) return false;
    if (document.type !== local.type) return false;
    if (local.inquiryId && document.inquiryId === local.inquiryId) return true;
    if (local.projectId && document.projectId === local.projectId && local.type !== "receipt") {
      return true;
    }
    if (local.paymentId && document.paymentId === local.paymentId) return true;
    const serverMs = Date.parse(document.createdAt);
    if (!Number.isNaN(localMs) && !Number.isNaN(serverMs)) {
      return Math.abs(serverMs - localMs) < 5_000;
    }
    return false;
  });
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

/**
 * Upload legacy `doc_*` rows once when online. Does not duplicate when a matching
 * server row already exists for the same type/project/payment/inquiry.
 */
export async function runLegacyDocumentBackfill(
  documents: StudioDocument[] = readCachedDocuments(),
): Promise<LegacyDocumentBackfillReport> {
  const studioId = getActiveStudioId() ?? "unknown";
  const migratedFromLegacyStorage = migrateLegacyDocumentsToStudioCache();

  const report: LegacyDocumentBackfillReport = {
    generatedAt: new Date().toISOString(),
    studioId,
    migratedFromLegacyStorage,
    legacyCandidates: 0,
    uploaded: 0,
    skipped: 0,
  };

  if (!studioId || studioId === "unknown" || !isBrowserOnline()) {
    persistBackfillReport(report);
    return report;
  }

  const locals = documents.filter((document) => isLegacyLocalDocumentId(document.id));
  report.legacyCandidates = locals.length;

  if (locals.length === 0) {
    persistBackfillReport(report);
    return report;
  }

  const serverDocuments: StudioDocumentResponseDto[] = [];
  let page = 1;
  while (page <= 20) {
    const response = await studioDocumentsApi.listStudioDocuments({ page, pageSize: 100 });
    serverDocuments.push(...response.data);
    if (response.data.length < 100) break;
    page += 1;
  }

  for (const local of locals) {
    if (isLikelyServerDocumentId(local.id)) {
      report.skipped += 1;
      continue;
    }

    const match = findServerMatch(local, serverDocuments);
    if (match) {
      report.skipped += 1;
      continue;
    }

    try {
      const created = await studioDocumentsApi.createStudioDocument(studioDocumentToCreateDto(local));
      serverDocuments.push(created);
      report.uploaded += 1;
    } catch {
      // Leave for next reconcile.
    }
  }

  persistBackfillReport(report);
  return report;
}

export function readLastDocumentBackfillReport(): LegacyDocumentBackfillReport | null {
  const studioId = getActiveStudioId();
  if (!studioId) return null;
  try {
    const raw = readStudioScopedItem(BACKFILL_REPORT_KEY, studioId);
    if (!raw) return null;
    return JSON.parse(raw) as LegacyDocumentBackfillReport;
  } catch {
    return null;
  }
}
