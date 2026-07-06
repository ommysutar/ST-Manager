export type PaymentMethod = "cash" | "upi";
export type PaymentSource = "advance" | "manual";

/** Every payment always belongs to exactly one project. */
export interface PaymentRecord {
  id: string;
  projectId: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
  receivedBy: string;
  source: PaymentSource;
  status: "received";
  createdAt: string;
}

export const PAYMENTS_STORAGE_KEY = "st-manager-payments";
