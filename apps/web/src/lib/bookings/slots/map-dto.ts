import type {
  BookingSlotDefinitionResponseDto,
  CreateBookingSlotDefinitionDto,
  UpdateBookingSlotDefinitionDto,
} from "@st-manager/contracts";

import type { BookingSlot } from "@/lib/bookings/types";

export function dtoToBookingSlot(dto: BookingSlotDefinitionResponseDto): BookingSlot {
  return {
    id: dto.id,
    label: dto.label?.trim() || "Booking Slot",
    startHour: dto.startHour,
    startMinute: dto.startMinute,
    endHour: dto.endHour,
    endMinute: dto.endMinute,
    isCustom: dto.isCustom ?? false,
    sortOrder: dto.sortOrder,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function bookingSlotToCreateDto(
  slot: Omit<BookingSlot, "id" | "createdAt" | "updatedAt">,
): CreateBookingSlotDefinitionDto {
  return {
    label: slot.label,
    startHour: slot.startHour,
    startMinute: slot.startMinute,
    endHour: slot.endHour,
    endMinute: slot.endMinute,
    isCustom: slot.isCustom,
    sortOrder: slot.sortOrder,
  };
}

export function bookingSlotPatchToUpdateDto(
  patch: Partial<Omit<BookingSlot, "id" | "createdAt">>,
): UpdateBookingSlotDefinitionDto {
  const dto: UpdateBookingSlotDefinitionDto = {};
  if (patch.label !== undefined) dto.label = patch.label;
  if (patch.startHour !== undefined) dto.startHour = patch.startHour;
  if (patch.startMinute !== undefined) dto.startMinute = patch.startMinute;
  if (patch.endHour !== undefined) dto.endHour = patch.endHour;
  if (patch.endMinute !== undefined) dto.endMinute = patch.endMinute;
  if (patch.isCustom !== undefined) dto.isCustom = patch.isCustom;
  if (patch.sortOrder !== undefined) dto.sortOrder = patch.sortOrder;
  return dto;
}

export function bookingSlotToResponseDto(
  slot: BookingSlot,
  studioId: string,
): BookingSlotDefinitionResponseDto {
  const now = new Date().toISOString();
  return {
    id: slot.id,
    studioId,
    label: slot.label,
    startHour: slot.startHour,
    startMinute: slot.startMinute,
    endHour: slot.endHour,
    endMinute: slot.endMinute,
    isCustom: slot.isCustom,
    sortOrder: slot.sortOrder,
    deletedAt: null,
    createdAt: slot.createdAt ?? now,
    updatedAt: slot.updatedAt ?? now,
  };
}
