export interface CreateBookingSlotDefinitionDto {
  label: string;
  startHour: number;
  startMinute?: number;
  endHour: number;
  endMinute?: number;
  isCustom?: boolean;
  sortOrder?: number;
}
