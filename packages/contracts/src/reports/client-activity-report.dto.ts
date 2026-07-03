export interface ClientActivityRowDto {
  clientId: string;
  clientName: string;
  bookingCount: number;
  sessionCount: number;
  revenue: number;
}

export interface ClientActivityReportDataDto {
  from: string;
  to: string;
  clients: ClientActivityRowDto[];
}

export interface ClientActivityReportResponseDto {
  success: true;
  data: ClientActivityReportDataDto;
}
