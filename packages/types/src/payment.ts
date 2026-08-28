export type PaymentMethod = "cash" | "upi";
export type PaymentSource = "advance" | "manual";
export type PaymentStatus = "received";

export interface Payment {
  id: string;
  studioId: string;
  projectId: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
  receivedBy: string;
  source: PaymentSource;
  status: PaymentStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
