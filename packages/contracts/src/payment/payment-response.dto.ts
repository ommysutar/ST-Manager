import type { Payment } from "@st-manager/types";

export interface PaymentResponseDto
  extends Omit<Payment, "createdAt" | "updatedAt" | "deletedAt"> {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
