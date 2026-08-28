import type {
  CreatePaymentDto,
  PaymentResponseDto,
  UpdatePaymentDto,
} from "@st-manager/contracts";

import type { PaymentRecord } from "./types";

export function dtoToPaymentRecord(dto: PaymentResponseDto): PaymentRecord {
  return {
    id: dto.id,
    projectId: dto.projectId,
    amount: Math.max(0, Math.round(dto.amount)),
    method: dto.method === "upi" ? "upi" : "cash",
    notes: dto.notes ?? "",
    receivedBy: dto.receivedBy ?? "",
    source: dto.source === "advance" ? "advance" : "manual",
    status: "received",
    createdAt: dto.createdAt,
  };
}

export function paymentRecordToCreateDto(payment: PaymentRecord): CreatePaymentDto {
  return {
    projectId: payment.projectId,
    amount: payment.amount,
    method: payment.method,
    notes: payment.notes,
    receivedBy: payment.receivedBy,
    source: payment.source,
    status: payment.status,
  };
}

export function paymentRecordToResponseDto(
  payment: PaymentRecord,
  studioId: string,
): PaymentResponseDto {
  const now = new Date().toISOString();
  return {
    id: payment.id,
    studioId,
    projectId: payment.projectId,
    amount: payment.amount,
    method: payment.method,
    notes: payment.notes,
    receivedBy: payment.receivedBy,
    source: payment.source,
    status: payment.status,
    deletedAt: null,
    createdAt: payment.createdAt,
    updatedAt: now,
  };
}

export function paymentPatchToUpdateDto(
  patch: Partial<Omit<PaymentRecord, "id" | "createdAt">>,
): UpdatePaymentDto {
  const dto: UpdatePaymentDto = {};

  if (patch.projectId !== undefined) dto.projectId = patch.projectId;
  if (patch.amount !== undefined) dto.amount = patch.amount;
  if (patch.method !== undefined) dto.method = patch.method;
  if (patch.notes !== undefined) dto.notes = patch.notes;
  if (patch.receivedBy !== undefined) dto.receivedBy = patch.receivedBy;
  if (patch.source !== undefined) dto.source = patch.source;
  if (patch.status !== undefined) dto.status = patch.status;

  return dto;
}
