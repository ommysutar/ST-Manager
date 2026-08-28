export type ProjectBookingStatus = "draft" | "booked" | "completed" | "cancelled";

export interface ProjectBookingPayload {
  engineerId?: string | null;
  sessionId?: string | null;
  attendanceRecorded?: boolean;
  equipmentIds?: string[];
  /** Set when offline flush hits a server slot conflict. */
  slotConflict?: boolean;
}

export interface ProjectBooking {
  id: string;
  studioId: string;
  projectId: string;
  /** Recording room id — maps to web `ProjectBooking.studioId`. */
  roomStudioId: string;
  clientId: string | null;
  bookingFor: string;
  notes: string;
  date: string;
  slotId: string;
  status: ProjectBookingStatus;
  clientName: string;
  projectName: string;
  projectNumber: string;
  payload: ProjectBookingPayload;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
