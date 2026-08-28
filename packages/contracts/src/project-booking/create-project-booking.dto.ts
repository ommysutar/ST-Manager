import type { ProjectBookingStatus } from "@st-manager/types";

export interface CreateProjectBookingDto {
  projectId: string;
  /** Recording room id — maps to web booking.studioId. */
  roomStudioId: string;
  clientId?: string | null;
  bookingFor: string;
  notes?: string;
  date: string;
  slotId: string;
  status?: ProjectBookingStatus;
  clientName: string;
  projectName: string;
  projectNumber: string;
  engineerId?: string | null;
  sessionId?: string | null;
  attendanceRecorded?: boolean;
  equipmentIds?: string[];
}
