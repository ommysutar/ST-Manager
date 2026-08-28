import type { StudioDocumentResponseDto } from "@st-manager/contracts";
import type { StudioDocument } from "@st-manager/types";

export function toStudioDocumentResponseDto(
  document: StudioDocument,
): StudioDocumentResponseDto {
  const { createdAt, updatedAt, deletedAt, ...rest } = document;
  return {
    ...rest,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    deletedAt: deletedAt ? deletedAt.toISOString() : null,
  };
}
