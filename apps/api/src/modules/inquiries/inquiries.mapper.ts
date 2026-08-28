import type { InquiryResponseDto } from "@st-manager/contracts";
import type { Inquiry } from "@st-manager/types";

export function toInquiryResponseDto(inquiry: Inquiry): InquiryResponseDto {
  return {
    id: inquiry.id,
    studioId: inquiry.studioId,
    inquiryNumber: inquiry.inquiryNumber,
    status: inquiry.status,
    projectId: inquiry.projectId,
    advanceAmount: inquiry.advanceAmount,
    remainingBalance: inquiry.remainingBalance,
    form: inquiry.form,
    quotation: inquiry.quotation,
    deletedAt: inquiry.deletedAt ? inquiry.deletedAt.toISOString() : null,
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
  };
}
