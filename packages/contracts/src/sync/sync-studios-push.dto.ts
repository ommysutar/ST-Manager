export interface SyncStudiosPushItemDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncStudiosPushRequestDto {
  studios: SyncStudiosPushItemDto[];
}

export type SyncStudiosPushResultStatus = "created" | "updated" | "unchanged";

export interface SyncStudiosPushResultDto {
  id: string;
  status: SyncStudiosPushResultStatus;
}

export interface SyncStudiosPushResponseDataDto {
  results: SyncStudiosPushResultDto[];
}

export interface SyncStudiosPushResponseDto {
  success: true;
  data: SyncStudiosPushResponseDataDto;
}
