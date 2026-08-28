import type { ProjectBooking, ProjectBookingPayload } from "@st-manager/types";

export interface ProjectBookingResponseDto
  extends Omit<ProjectBooking, "createdAt" | "updatedAt" | "deletedAt" | "payload">,
    ProjectBookingPayload {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
