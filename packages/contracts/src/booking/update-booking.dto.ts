export interface UpdateBookingDto {
  studioId?: string;
  clientId?: string | null;
  title?: string;
  startAt?: string;
  endAt?: string;
  notes?: string | null;
}
