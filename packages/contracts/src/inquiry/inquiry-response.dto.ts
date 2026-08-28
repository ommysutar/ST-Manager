import type { Inquiry } from "@st-manager/types";

export interface InquiryResponseDto
  extends Omit<Inquiry, "createdAt" | "updatedAt" | "deletedAt"> {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
