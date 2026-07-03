export interface GenerateStudioSummaryRequestDto {
  studioId: string;
  name: string;
}

export interface GenerateStudioSummaryResponseDataDto {
  summary: string;
}

export interface GenerateStudioSummaryResponseDto {
  success: true;
  data: GenerateStudioSummaryResponseDataDto;
}
