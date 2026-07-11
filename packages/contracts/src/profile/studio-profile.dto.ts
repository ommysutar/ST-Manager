export interface StudioUserProfileDto {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  studioId: string | null;
  studioName: string | null;
}

export interface UpdateStudioUserProfileRequestDto {
  fullName?: string;
  phone?: string | null;
  studioName?: string;
}

export interface GetStudioUserProfileResponseDto {
  success: true;
  data: StudioUserProfileDto;
}

export interface UpdateStudioUserProfileResponseDto {
  success: true;
  data: StudioUserProfileDto;
}
