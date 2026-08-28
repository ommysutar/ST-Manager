import type { PaymentResponseDto } from "@st-manager/contracts";

import { paymentsApi } from "@/lib/api-client";
import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";
import { isBrowserOnline } from "@/lib/sync";

import { paymentRecordToCreateDto } from "./map-dto";
import { isLocalPaymentId } from "./offline-queue";
import type { PaymentRecord } from "./types";
import { PAYMENTS_STORAGE_KEY } from "./types";

const PAYMENTS_CACHE_KEY = "st-manager-payments-cache";
const BACKFILL_REPORT_KEY = "st-manager-payments-backfill-report";

/** Legacy browser-generated ids (`pay_*`), not offline queue (`local_pay_*`) or server cuid. */
export function isLegacyLocalPaymentId(id: string): boolean {
  return id.startsWith("pay_") && !isLocalPaymentId(id);
}

function isLikelyServerPaymentId(id: string): boolean {
  return !isLocalPaymentId(id) && !isLegacyLocalPaymentId(id);
}

export interface LegacyPaymentBackfillReport {
  generatedAt: string;
  studioId: string;
  migratedFromLegacyStorage: boolean;
  legacyCandidates: number;
  uploaded: number;
  skipped: number;
}

function persistBackfillReport(report: LegacyPaymentBackfillReport): void {
  const studioId = getActiveStudioId();
  if (!studioId) return;
  writeStudioScopedItem(BACKFILL_REPORT_KEY, JSON.stringify(report), studioId);
}

/**
 * Idempotent migration from global `st-manager-payments` localStorage into the
 * active studio cache. Safe to call on every hydrate.
 */
export function migrateLegacyPaymentsToStudioCache(): boolean {
  const studioId = getActiveStudioId();
  if (!studioId || typeof window === "undefined") {
    return false;
  }
  if (readStudioScopedItem(PAYMENTS_CACHE_KEY, studioId)) {
    return false;
  }
  try {
    const legacy = window.localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (!legacy) {
      return false;
    }
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed)) {
      writeStudioScopedItem(PAYMENTS_CACHE_KEY, legacy, studioId);
      return true;
    }
  } catch {
    // ignore corrupt legacy cache
  }
  return false;
}

function findServerMatch(
  local: PaymentRecord,
  serverPayments: PaymentResponseDto[],
): PaymentResponseDto | undefined {
  const localMs = Date.parse(local.createdAt);
  return serverPayments.find((payment) => {
    if (payment.deletedAt) return false;
    if (payment.projectId !== local.projectId) return false;
    if (payment.amount !== local.amount) return false;
    if (payment.method !== local.method) return false;
    const serverMs = Date.parse(payment.createdAt);
    if (!Number.isNaN(localMs) && !Number.isNaN(serverMs)) {
      return Math.abs(serverMs - localMs) < 5_000;
    }
    return payment.notes === local.notes && payment.receivedBy === local.receivedBy;
  });
}

/**
 * Upload legacy `pay_*` rows once when online. Does not duplicate when a matching
 * server row already exists for the same project/amount/timestamp.
 */
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

export async function runLegacyPaymentBackfill(
  payments: PaymentRecord[] = readCachedPayments(),
): Promise<LegacyPaymentBackfillReport> {
  const studioId = getActiveStudioId() ?? "unknown";
  const migratedFromLegacyStorage = migrateLegacyPaymentsToStudioCache();

  const report: LegacyPaymentBackfillReport = {
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

  const locals = payments.filter((payment) => isLegacyLocalPaymentId(payment.id));
  report.legacyCandidates = locals.length;

  if (locals.length === 0) {
    persistBackfillReport(report);
    return report;
  }

  const serverPayments: PaymentResponseDto[] = [];
  let page = 1;
  while (page <= 20) {
    const response = await paymentsApi.listPayments({ page, pageSize: 100 });
    serverPayments.push(...response.data);
    if (response.data.length < 100) break;
    page += 1;
  }

  for (const local of locals) {
    if (isLikelyServerPaymentId(local.id)) {
      report.skipped += 1;
      continue;
    }

    const match = findServerMatch(local, serverPayments);
    if (match) {
      report.skipped += 1;
      continue;
    }

    try {
      const created = await paymentsApi.createPayment(paymentRecordToCreateDto(local));
      serverPayments.push(created);
      report.uploaded += 1;
    } catch {
      // Leave for next reconcile.
    }
  }

  persistBackfillReport(report);
  return report;
}

export function readLastPaymentBackfillReport(): LegacyPaymentBackfillReport | null {
  const studioId = getActiveStudioId();
  if (!studioId) return null;
  try {
    const raw = readStudioScopedItem(BACKFILL_REPORT_KEY, studioId);
    if (!raw) return null;
    return JSON.parse(raw) as LegacyPaymentBackfillReport;
  } catch {
    return null;
  }
}
