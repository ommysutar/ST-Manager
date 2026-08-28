import type { BookingSlotDefinition } from "@st-manager/types";

export interface BookingSlotDefinitionResponseDto
  extends Omit<BookingSlotDefinition, "createdAt" | "updatedAt" | "deletedAt"> {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
