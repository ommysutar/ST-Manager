export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  id: string;
  studioId: string;
  clientId: string | null;
  title: string;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingWithRelations extends Booking {
  studioName: string;
  clientName: string | null;
}
