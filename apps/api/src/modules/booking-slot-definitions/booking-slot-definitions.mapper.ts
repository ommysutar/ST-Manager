import type { BookingSlotDefinitionResponseDto } from "@st-manager/contracts";
import type { BookingSlotDefinition } from "@st-manager/types";

export function toBookingSlotDefinitionResponseDto(
  slot: BookingSlotDefinition,
): BookingSlotDefinitionResponseDto {
  return {
    id: slot.id,
    studioId: slot.studioId,
    label: slot.label,
    startHour: slot.startHour,
    startMinute: slot.startMinute,
    endHour: slot.endHour,
    endMinute: slot.endMinute,
    isCustom: slot.isCustom,
    sortOrder: slot.sortOrder,
    deletedAt: slot.deletedAt ? slot.deletedAt.toISOString() : null,
    createdAt: slot.createdAt.toISOString(),
    updatedAt: slot.updatedAt.toISOString(),
  };
}
