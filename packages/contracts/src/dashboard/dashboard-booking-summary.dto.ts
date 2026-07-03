/**
 * Schema-ready booking summary for dashboard widgets (M16).
 * M14 returns an empty array; shape is fixed so clients can render without changes later.
 */
export interface DashboardBookingSummaryDto {
  id: string;
  title: string;
  studioId: string;
  studioName: string;
  startAt: string;
  endAt: string;
}
