export type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Session {
  id: string;
  studioId: string;
  clientId: string | null;
  bookingId: string | null;
  title: string;
  startedAt: Date;
  endedAt: Date | null;
  status: SessionStatus;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionWithRelations extends Session {
  studioName: string;
  clientName: string | null;
  bookingTitle: string | null;
}
