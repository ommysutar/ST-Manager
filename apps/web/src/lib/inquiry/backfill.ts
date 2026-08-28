import type { InquiryResponseDto } from "@st-manager/contracts";

import { inquiriesApi } from "@/lib/api-client";
import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";
import { isBrowserOnline } from "@/lib/sync";

import { cascadeInquiryIdRemap } from "./cascade-ids";
import { savedInquiryToCreateDto } from "./map-dto";
import { isLocalInquiryId } from "./offline-queue";
import type { InquiryWizardFormValues, SavedInquiry } from "./types";
import { INQUIRIES_STORAGE_KEY } from "./types";
import {
  getInquiriesStoreSnapshot,
  remapLocalInquiryId,
} from "./store";

const INQUIRIES_CACHE_KEY = "st-manager-inquiries-cache";
const ID_MAP_KEY = "st-manager-inquiry-id-map";
const BACKFILL_REPORT_KEY = "st-manager-inquiry-backfill-report";

type InquiryIdMap = Record<string, string>;

export interface LegacyInquiryBackfillCandidate {
  localId: string;
  inquiryNumber: string;
  projectName: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  alreadyMapped: boolean;
  serverId?: string;
}

export interface LegacyInquiryBackfillAction {
  localId: string;
  action: "skip_mapped" | "match_server" | "create_server" | "skip_server_id";
  serverId?: string;
  reason: string;
}

export interface LegacyInquiryBackfillReport {
  generatedAt: string;
  studioId: string;
  candidates: LegacyInquiryBackfillCandidate[];
  plannedActions: LegacyInquiryBackfillAction[];
}

/** Legacy browser-generated ids (`inq_*`), not offline queue (`local_inq_*`) or server cuid. */
export function isLegacyLocalInquiryId(id: string): boolean {
  return id.startsWith("inq_") && !isLocalInquiryId(id);
}

function isLikelyServerInquiryId(id: string): boolean {
  return !isLocalInquiryId(id) && !isLegacyLocalInquiryId(id);
}

function readIdMap(studioId: string | null = getActiveStudioId()): InquiryIdMap {
  if (!studioId) return {};
  try {
    const raw = readStudioScopedItem(ID_MAP_KEY, studioId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as InquiryIdMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeIdMap(map: InquiryIdMap, studioId: string | null = getActiveStudioId()): void {
  if (!studioId) return;
  writeStudioScopedItem(ID_MAP_KEY, JSON.stringify(map), studioId);
}

function persistBackfillReport(report: LegacyInquiryBackfillReport): void {
  const studioId = getActiveStudioId();
  if (!studioId) return;
  writeStudioScopedItem(BACKFILL_REPORT_KEY, JSON.stringify(report), studioId);
}

function findServerMatch(
  local: SavedInquiry,
  serverInquiries: InquiryResponseDto[],
): InquiryResponseDto | undefined {
  if (local.inquiryNumber) {
    const byNumber = serverInquiries.find(
      (inquiry) =>
        !inquiry.deletedAt &&
        inquiry.inquiryNumber.toLowerCase() === local.inquiryNumber.toLowerCase(),
    );
    if (byNumber) return byNumber;
  }

  const nameKey = `${local.form.projectName.trim().toLowerCase()}|${local.form.clientName.trim().toLowerCase()}|${local.form.mobileNumber.trim()}`;
  return serverInquiries.find((inquiry) => {
    if (inquiry.deletedAt) return false;
    const form = inquiry.form as InquiryWizardFormValues;
    const key = `${form.projectName.trim().toLowerCase()}|${form.clientName.trim().toLowerCase()}|${form.mobileNumber.trim()}`;
    return key === nameKey;
  });
}

/**
 * Idempotent migration from global `st-manager-inquiries` localStorage into the
 * active studio cache. Safe to call on every hydrate.
 */
export function migrateLegacyInquiriesToStudioCache(): boolean {
  const studioId = getActiveStudioId();
  if (!studioId || typeof window === "undefined") {
    return false;
  }
  if (readStudioScopedItem(INQUIRIES_CACHE_KEY, studioId)) {
    return false;
  }
  try {
    const legacy = window.localStorage.getItem(INQUIRIES_STORAGE_KEY);
    if (!legacy) {
      return false;
    }
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed)) {
      writeStudioScopedItem(INQUIRIES_CACHE_KEY, legacy, studioId);
      return true;
    }
  } catch {
    // ignore corrupt legacy cache
  }
  return false;
}

export function analyzeLegacyInquiryBackfill(
  inquiries: SavedInquiry[] = getInquiriesStoreSnapshot(),
): LegacyInquiryBackfillReport {
  const studioId = getActiveStudioId() ?? "unknown";
  const idMap = readIdMap(studioId === "unknown" ? null : studioId);

  const candidates: LegacyInquiryBackfillCandidate[] = [];
  const plannedActions: LegacyInquiryBackfillAction[] = [];

  for (const inquiry of inquiries) {
    if (isLikelyServerInquiryId(inquiry.id)) {
      plannedActions.push({
        localId: inquiry.id,
        action: "skip_server_id",
        serverId: inquiry.id,
        reason: "Already a server-backed inquiry id.",
      });
      continue;
    }

    if (isLocalInquiryId(inquiry.id)) {
      plannedActions.push({
        localId: inquiry.id,
        action: "skip_mapped",
        reason: "Offline pending create — wait for flush, not legacy backfill.",
      });
      continue;
    }

    if (!isLegacyLocalInquiryId(inquiry.id)) {
      plannedActions.push({
        localId: inquiry.id,
        action: "skip_mapped",
        reason: "Unknown id format — manual review required.",
      });
      continue;
    }

    const mappedServerId = idMap[inquiry.id];
    candidates.push({
      localId: inquiry.id,
      inquiryNumber: inquiry.inquiryNumber,
      projectName: inquiry.form.projectName,
      clientName: inquiry.form.clientName,
      createdAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt,
      alreadyMapped: Boolean(mappedServerId),
      serverId: mappedServerId,
    });

    if (mappedServerId) {
      plannedActions.push({
        localId: inquiry.id,
        action: "skip_mapped",
        serverId: mappedServerId,
        reason: "Already mapped in studio id map.",
      });
    } else {
      plannedActions.push({
        localId: inquiry.id,
        action: "create_server",
        reason: "Will match existing server row or create once (idempotent).",
      });
    }
  }

  const report: LegacyInquiryBackfillReport = {
    generatedAt: new Date().toISOString(),
    studioId,
    candidates,
    plannedActions,
  };
  persistBackfillReport(report);
  return report;
}

/**
 * Idempotent legacy inquiry upload. Safe to run on every reconcile when online.
 * Does not create duplicates when inquiryNumber or client/project/mobile already exists server-side.
 */
export async function runLegacyInquiryBackfill(): Promise<LegacyInquiryBackfillReport> {
  const studioId = getActiveStudioId();
  if (!studioId || !isBrowserOnline()) {
    return analyzeLegacyInquiryBackfill();
  }

  const locals = getInquiriesStoreSnapshot().filter((inquiry) => isLegacyLocalInquiryId(inquiry.id));
  if (locals.length === 0) {
    return analyzeLegacyInquiryBackfill();
  }

  const idMap = readIdMap(studioId);
  const serverInquiries: InquiryResponseDto[] = [];
  let page = 1;
  while (page <= 20) {
    const response = await inquiriesApi.listInquiries({ page, pageSize: 100 });
    serverInquiries.push(...response.data);
    if (response.data.length < 100) break;
    page += 1;
  }

  for (const local of locals) {
    const existingMap = idMap[local.id];
    if (existingMap) {
      cascadeInquiryIdRemap(local.id, existingMap);
      continue;
    }

    const match = findServerMatch(local, serverInquiries);
    if (match) {
      idMap[local.id] = match.id;
      remapLocalInquiryId(local.id, match);
      cascadeInquiryIdRemap(local.id, match.id);
      continue;
    }

    try {
      const created = await inquiriesApi.createInquiry(savedInquiryToCreateDto(local));
      idMap[local.id] = created.id;
      serverInquiries.push(created);
      remapLocalInquiryId(local.id, created);
      cascadeInquiryIdRemap(local.id, created.id);
    } catch {
      // Leave for next reconcile — report captures pending candidates.
    }
  }

  writeIdMap(idMap, studioId);
  return analyzeLegacyInquiryBackfill();
}

export function readLastInquiryBackfillReport(): LegacyInquiryBackfillReport | null {
  const studioId = getActiveStudioId();
  if (!studioId) return null;
  try {
    const raw = readStudioScopedItem(BACKFILL_REPORT_KEY, studioId);
    if (!raw) return null;
    return JSON.parse(raw) as LegacyInquiryBackfillReport;
  } catch {
    return null;
  }
}
