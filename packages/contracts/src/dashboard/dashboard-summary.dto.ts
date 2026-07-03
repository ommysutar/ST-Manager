import type { StudioResponseDto } from "../studio/studio-response.dto";
import type { DashboardBookingSummaryDto } from "./dashboard-booking-summary.dto";
import type { DashboardClientSummaryDto } from "./dashboard-client-summary.dto";

export interface DashboardSummaryDataDto {
  studioCount: number;
  recentStudios: StudioResponseDto[];
  todayBookings: DashboardBookingSummaryDto[];
  clientCount: number;
  recentClients: DashboardClientSummaryDto[];
  monthRevenue: number;
  utilizationPercent: number;
}

export interface DashboardSummaryResponseDto {
  success: true;
  data: DashboardSummaryDataDto;
}
