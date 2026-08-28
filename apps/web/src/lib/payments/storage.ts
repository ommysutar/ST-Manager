import type { QuotationBreakdown } from "@/lib/inquiry/types";
import { evaluateProjectCompletion, getProject, updateProject } from "@/lib/projects/storage";
import type { StudioProject } from "@/lib/projects/types";
import { isBrowserOnline } from "@/lib/sync";

import { notifyPaymentsUpdated } from "./events";
import {
  createPaymentOfflineAware,
  flushPendingPaymentCreates,
  getPaymentsStoreSnapshot,
  hydratePaymentsSnapshotFromCache,
  isLocalPaymentId,
  upsertPaymentInSnapshot,
} from "./store";
import { getPaymentsSnapshot, setPaymentsSnapshot } from "./snapshots";
import type { PaymentMethod, PaymentRecord, PaymentSource } from "./types";
import { PAYMENTS_STORAGE_KEY } from "./types";

function normalizePayment(raw: Partial<PaymentRecord> & { id: string }): PaymentRecord {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    projectId: String(raw.projectId ?? ""),
    amount: Math.max(0, Math.round(Number(raw.amount ?? 0))),
    method: raw.method === "upi" ? "upi" : "cash",
    notes: raw.notes ?? "",
    receivedBy: raw.receivedBy ?? "",
    source: raw.source === "advance" ? "advance" : "manual",
    status: "received",
    createdAt: raw.createdAt ?? now,
  };
}

function ensurePaymentsHydrated(): PaymentRecord[] {
  if (getPaymentsStoreSnapshot().length === 0) {
    hydratePaymentsSnapshotFromCache();
  }
  return getPaymentsStoreSnapshot();
}

export function loadAllPayments(): PaymentRecord[] {
  return ensurePaymentsHydrated();
}

export function listPayments(): PaymentRecord[] {
  return loadAllPayments();
}

export function listPaymentsByProject(projectId: string): PaymentRecord[] {
  return loadAllPayments().filter((payment) => payment.projectId === projectId);
}

export function getPayment(paymentId: string): PaymentRecord | undefined {
  return loadAllPayments().find((payment) => payment.id === paymentId);
}

export function getProjectReceivedTotal(projectId: string): number {
  return listPaymentsByProject(projectId).reduce((sum, payment) => sum + payment.amount, 0);
}

/** Recomputes the project's cached balance fields from the payment ledger — the source of truth. */
function syncProjectBalance(projectId: string, grandTotalOverride?: number): StudioProject | null {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  const grandTotal = grandTotalOverride ?? project.grandTotal;
  const received = getProjectReceivedTotal(projectId);

  const updated = updateProject(projectId, {
    grandTotal,
    advanceReceived: received,
    remainingBalance: Math.max(0, grandTotal - received),
  });

  return evaluateProjectCompletion(projectId) ?? updated;
}

export function syncProjectBalanceForProject(
  projectId: string,
  grandTotalOverride?: number,
): StudioProject | null {
  return syncProjectBalance(projectId, grandTotalOverride);
}

export interface ReceivePaymentInput {
  projectId: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
  receivedBy: string;
  source?: PaymentSource;
}

export async function addPayment(input: ReceivePaymentInput): Promise<PaymentRecord> {
  const project = getProject(input.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const record = await createPaymentOfflineAware({
    projectId: input.projectId,
    amount: Math.max(0, Math.round(input.amount)),
    method: input.method,
    notes: input.notes,
    receivedBy: input.receivedBy,
    source: input.source ?? "manual",
    status: "received",
  });

  syncProjectBalance(input.projectId);

  if (isBrowserOnline()) {
    void flushPendingPaymentCreates();
  }

  return normalizePayment(record);
}

export type ServiceLineType = "service" | "custom" | "rent";

/** Owner edits a service/custom/rent amount — recalculates quotation, project total, and pending balance. */
export function updateProjectServiceLineAmount(
  projectId: string,
  lineType: ServiceLineType,
  lineId: string | null,
  newAmount: number,
): StudioProject | null {
  const project = getProject(projectId);
  if (!project?.quotation) {
    return null;
  }

  const amount = Math.max(0, Math.round(newAmount));
  const quotation: QuotationBreakdown = { ...project.quotation };

  if (lineType === "service" && lineId) {
    quotation.serviceLines = quotation.serviceLines.map((line) =>
      line.id === lineId ? { ...line, price: amount } : line,
    );
  } else if (lineType === "custom" && lineId) {
    quotation.customServiceLines = quotation.customServiceLines.map((line) =>
      line.id === lineId ? { ...line, price: amount } : line,
    );
  } else if (lineType === "rent") {
    quotation.studioRentAmount = amount;
  }

  const servicesSubtotal =
    quotation.serviceLines.reduce((sum, line) => sum + line.price, 0) +
    quotation.customServiceLines.reduce((sum, line) => sum + line.price, 0) +
    quotation.studioRentAmount;

  quotation.servicesSubtotal = servicesSubtotal;
  quotation.subtotal = servicesSubtotal;
  quotation.grandTotal = Math.max(0, servicesSubtotal - quotation.discountAmount);

  updateProject(projectId, { quotation, grandTotal: quotation.grandTotal });
  syncProjectBalance(projectId, quotation.grandTotal);
  return getProject(projectId) ?? null;
}

export function syncAllProjectBalancesFromPayments(): void {
  const projectIds = new Set(ensurePaymentsHydrated().map((payment) => payment.projectId));
  for (const projectId of projectIds) {
    syncProjectBalance(projectId);
  }
}

export function initializePaymentSnapshots(): void {
  hydratePaymentsSnapshotFromCache();
  setPaymentsSnapshot(getPaymentsStoreSnapshot());
}

export { getPaymentsSnapshot, PAYMENTS_STORAGE_KEY, flushPendingPaymentCreates, isLocalPaymentId, upsertPaymentInSnapshot };
