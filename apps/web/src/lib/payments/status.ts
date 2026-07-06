export type PaymentStatusLabel = "paid" | "partial" | "pending" | "no_charge";

export interface ProjectBalanceLike {
  grandTotal: number;
  remainingBalance: number;
  advanceReceived: number;
}

export function getPaymentStatus(project: ProjectBalanceLike): PaymentStatusLabel {
  if (project.grandTotal <= 0) {
    return "no_charge";
  }
  if (project.remainingBalance <= 0) {
    return "paid";
  }
  if (project.advanceReceived > 0) {
    return "partial";
  }
  return "pending";
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusLabel, string> = {
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
  no_charge: "—",
};
