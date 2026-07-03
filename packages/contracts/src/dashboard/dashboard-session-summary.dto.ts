import type { SessionStatus } from "@st-manager/types";

export interface DashboardSessionSummaryDto {
  id: string;
  title: string;
  studioId: string;
  studioName: string;
  clientName: string | null;
  startedAt: string;
  status: SessionStatus;
}
