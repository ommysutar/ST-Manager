import type { PaymentRecord } from "./types";

let paymentsSnapshot: PaymentRecord[] = [];

export function getPaymentsSnapshot(): PaymentRecord[] {
  return paymentsSnapshot;
}

export function setPaymentsSnapshot(next: PaymentRecord[]): PaymentRecord[] {
  paymentsSnapshot = next;
  return paymentsSnapshot;
}
