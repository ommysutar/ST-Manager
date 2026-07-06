import type { QuotationBreakdown } from "@/lib/inquiry/types";
import { generateId } from "@/lib/inquiry/services";
import { evaluateProjectCompletion, getProject, updateProject } from "@/lib/projects/storage";
import type { StudioProject } from "@/lib/projects/types";

import { notifyPaymentsUpdated } from "./events";
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

function readPaymentsFromStorage(): PaymentRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<PaymentRecord>[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((entry) => normalizePayment(entry as PaymentRecord));
  } catch {
    return [];
  }
}

function persistPayments(payments: PaymentRecord[]): PaymentRecord[] {
  const sorted = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(sorted));
  setPaymentsSnapshot(sorted);
  notifyPaymentsUpdated();
  return sorted;
}

export function loadAllPayments(): PaymentRecord[] {
  return readPaymentsFromStorage();
}

export function listPayments(): PaymentRecord[] {
  return loadAllPayments();
}

export function listPaymentsByProject(projectId: string): PaymentRecord[] {
  return loadAllPayments().filter((payment) => payment.projectId === projectId);
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

  // Full payment can complete a project on its own (tasks may already be done) — re-run the
  // completion rule engine so status + the "Payment" task stay in sync with the ledger.
  return evaluateProjectCompletion(projectId) ?? updated;
}

export interface ReceivePaymentInput {
  projectId: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
  receivedBy: string;
  source?: PaymentSource;
}

export function addPayment(input: ReceivePaymentInput): PaymentRecord {
  const project = getProject(input.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const record = normalizePayment({
    id: generateId("pay"),
    projectId: input.projectId,
    amount: input.amount,
    method: input.method,
    notes: input.notes,
    receivedBy: input.receivedBy,
    source: input.source ?? "manual",
    createdAt: new Date().toISOString(),
  });

  persistPayments([record, ...loadAllPayments()]);
  syncProjectBalance(input.projectId);
  return record;
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

export function initializePaymentSnapshots(): void {
  setPaymentsSnapshot(loadAllPayments());
}

export { getPaymentsSnapshot };
