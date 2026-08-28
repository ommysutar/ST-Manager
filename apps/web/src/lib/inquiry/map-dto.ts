import type {
  CreateInquiryDto,
  InquiryResponseDto,
  UpdateInquiryDto,
} from "@st-manager/contracts";

import type { InquiryStatus, InquiryWizardFormValues, QuotationBreakdown, SavedInquiry } from "./types";

function nullToUndefined(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return value;
}

function asInquiryStatus(value: string): InquiryStatus {
  return value === "project" ? "project" : "inquiry";
}

export function dtoToSavedInquiry(dto: InquiryResponseDto): SavedInquiry {
  return {
    id: dto.id,
    inquiryNumber: dto.inquiryNumber,
    status: asInquiryStatus(dto.status),
    projectId: nullToUndefined(dto.projectId),
    advanceAmount: dto.advanceAmount ?? undefined,
    remainingBalance: dto.remainingBalance ?? undefined,
    form: dto.form as InquiryWizardFormValues,
    quotation: dto.quotation as QuotationBreakdown,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function savedInquiryToCreateDto(inquiry: SavedInquiry): CreateInquiryDto {
  return {
    status: inquiry.status,
    projectId: inquiry.projectId ?? null,
    advanceAmount: inquiry.advanceAmount ?? null,
    remainingBalance: inquiry.remainingBalance ?? null,
    form: inquiry.form,
    quotation: inquiry.quotation,
  };
}

export function savedInquiryToResponseDto(
  inquiry: SavedInquiry,
  studioId: string,
): InquiryResponseDto {
  return {
    id: inquiry.id,
    studioId,
    inquiryNumber: inquiry.inquiryNumber,
    status: inquiry.status,
    projectId: inquiry.projectId ?? null,
    advanceAmount: inquiry.advanceAmount ?? null,
    remainingBalance: inquiry.remainingBalance ?? null,
    form: inquiry.form,
    quotation: inquiry.quotation,
    deletedAt: null,
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
  };
}

export function savedInquiryPatchToUpdateDto(
  patch: Partial<
    Pick<SavedInquiry, "form" | "quotation" | "status" | "projectId" | "advanceAmount" | "remainingBalance">
  >,
): UpdateInquiryDto {
  const dto: UpdateInquiryDto = {};

  if (patch.status !== undefined) dto.status = patch.status;
  if (patch.projectId !== undefined) dto.projectId = patch.projectId ?? null;
  if (patch.advanceAmount !== undefined) dto.advanceAmount = patch.advanceAmount ?? null;
  if (patch.remainingBalance !== undefined) dto.remainingBalance = patch.remainingBalance ?? null;
  if (patch.form !== undefined) dto.form = patch.form;
  if (patch.quotation !== undefined) dto.quotation = patch.quotation;

  return dto;
}
