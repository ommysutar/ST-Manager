export interface UtilizationStudioBreakdownDto {
  studioId: string;
  studioName: string;
  usedMinutes: number;
  availableMinutes: number;
  utilizationPercent: number;
}

export interface UtilizationReportDataDto {
  from: string;
  to: string;
  overallPercent: number;
  totalUsedMinutes: number;
  totalAvailableMinutes: number;
  byStudio: UtilizationStudioBreakdownDto[];
}

export interface UtilizationReportResponseDto {
  success: true;
  data: UtilizationReportDataDto;
}
