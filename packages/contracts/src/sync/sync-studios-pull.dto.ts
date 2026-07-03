import type { StudioResponseDto } from "../studio/studio-response.dto";

export interface SyncStudiosPullQueryDto {
  since?: string;
}

export interface SyncStudiosPullResponseDataDto {
  studios: StudioResponseDto[];
  serverTime: string;
}

export interface SyncStudiosPullResponseDto {
  success: true;
  data: SyncStudiosPullResponseDataDto;
}
