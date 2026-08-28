import type {
  CreateStudioDocumentDto,
  StudioDocumentResponseDto,
  UpdateStudioDocumentDto,
} from "@st-manager/contracts";

import type { DocumentSnapshot, StudioDocument } from "./types";

function normalizeSnapshot(raw: unknown): DocumentSnapshot | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const snapshot = raw as Partial<DocumentSnapshot>;
  if (!snapshot.clientName || !snapshot.projectName || !snapshot.projectNumber) {
    return undefined;
  }

  return {
    clientId: snapshot.clientId ?? "",
    clientDisplayNumber: snapshot.clientDisplayNumber ?? "",
    clientName: snapshot.clientName,
    clientMobile: snapshot.clientMobile ?? "",
    clientEmail: snapshot.clientEmail ?? "",
    clientAddress: snapshot.clientAddress ?? "",
    projectId: snapshot.projectId ?? "",
    projectNumber: snapshot.projectNumber,
    projectName: snapshot.projectName,
    projectCategory: snapshot.projectCategory ?? "",
    lineItems: Array.isArray(snapshot.lineItems) ? snapshot.lineItems : [],
    subtotal: Number(snapshot.subtotal ?? 0),
    discountAmount: Number(snapshot.discountAmount ?? 0),
    grandTotal: Number(snapshot.grandTotal ?? 0),
    paymentId: snapshot.paymentId,
    paymentAmount: snapshot.paymentAmount,
    paymentMethod: snapshot.paymentMethod,
    paymentDate: snapshot.paymentDate,
    paymentNotes: snapshot.paymentNotes,
    paymentReceivedBy: snapshot.paymentReceivedBy,
    capturedAt: snapshot.capturedAt ?? new Date().toISOString(),
  };
}

export function dtoToStudioDocument(dto: StudioDocumentResponseDto): StudioDocument {
  return {
    id: dto.id,
    type: dto.type,
    documentNumber: dto.documentNumber,
    inquiryId: dto.inquiryId ?? undefined,
    projectId: dto.projectId ?? undefined,
    paymentId: dto.paymentId ?? undefined,
    snapshot: normalizeSnapshot(dto.snapshot),
    createdAt: dto.createdAt,
  };
}

export function studioDocumentToCreateDto(document: StudioDocument): CreateStudioDocumentDto {
  return {
    type: document.type,
    inquiryId: document.inquiryId ?? null,
    projectId: document.projectId ?? null,
    paymentId: document.paymentId ?? null,
    snapshot: document.snapshot ?? null,
  };
}

export function studioDocumentToResponseDto(
  document: StudioDocument,
  studioId: string,
): StudioDocumentResponseDto {
  const now = new Date().toISOString();
  return {
    id: document.id,
    studioId,
    type: document.type,
    documentNumber: document.documentNumber,
    inquiryId: document.inquiryId ?? null,
    projectId: document.projectId ?? null,
    paymentId: document.paymentId ?? null,
    snapshot: document.snapshot ?? null,
    deletedAt: null,
    createdAt: document.createdAt,
    updatedAt: now,
  };
}

export function studioDocumentPatchToUpdateDto(
  patch: Partial<Pick<StudioDocument, "inquiryId" | "projectId" | "paymentId" | "snapshot">>,
): UpdateStudioDocumentDto {
  const dto: UpdateStudioDocumentDto = {};

  if (patch.inquiryId !== undefined) dto.inquiryId = patch.inquiryId ?? null;
  if (patch.projectId !== undefined) dto.projectId = patch.projectId ?? null;
  if (patch.paymentId !== undefined) dto.paymentId = patch.paymentId ?? null;
  if (patch.snapshot !== undefined) dto.snapshot = patch.snapshot ?? null;

  return dto;
}
