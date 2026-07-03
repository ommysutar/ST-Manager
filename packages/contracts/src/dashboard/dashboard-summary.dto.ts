import type { StudioResponseDto } from "../studio/studio-response.dto";
import type { DashboardBookingSummaryDto } from "./dashboard-booking-summary.dto";
import type { DashboardClientSummaryDto } from "./dashboard-client-summary.dto";
import type { DashboardInvoiceSummaryDto } from "./dashboard-invoice-summary.dto";
import type { DashboardRevenueTrendPointDto } from "./dashboard-revenue-trend.dto";
import type { DashboardSessionSummaryDto } from "./dashboard-session-summary.dto";

export interface DashboardSummaryDataDto {
  studioCount: number;
  recentStudios: StudioResponseDto[];
  todayBookings: DashboardBookingSummaryDto[];
  clientCount: number;
  recentClients: DashboardClientSummaryDto[];
  sessionsInProgress: DashboardSessionSummaryDto[];
  completedTodaySessions: DashboardSessionSummaryDto[];
  monthRevenue: number;
  outstandingBalance: number;
  outstandingInvoices: DashboardInvoiceSummaryDto[];
  paidThisMonthInvoices: DashboardInvoiceSummaryDto[];
  utilizationPercent: number;
  revenueTrend: DashboardRevenueTrendPointDto[];
}

export interface DashboardSummaryResponseDto {
  success: true;
  data: DashboardSummaryDataDto;
}
