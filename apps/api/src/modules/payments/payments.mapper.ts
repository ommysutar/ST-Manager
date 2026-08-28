import type { PaymentResponseDto } from "@st-manager/contracts";
import type { Payment } from "@st-manager/types";

export function toPaymentResponseDto(payment: Payment): PaymentResponseDto {
  const { createdAt, updatedAt, deletedAt, ...rest } = payment;
  return {
    ...rest,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    deletedAt: deletedAt ? deletedAt.toISOString() : null,
  };
}
