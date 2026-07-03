export interface RevenueDailyBreakdownDto {
  date: string;
  revenue: number;
  invoiceCount: number;
}

export interface RevenueReportDataDto {
  from: string;
  to: string;
  totalRevenue: number;
  invoiceCount: number;
  dailyBreakdown: RevenueDailyBreakdownDto[];
}

export interface RevenueReportResponseDto {
  success: true;
  data: RevenueReportDataDto;
}
