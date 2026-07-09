import type { ApiSuccessResponseDto } from "../common/success-response.dto";
import type { LoginResponseDataDto } from "../auth/login.dto";

export interface InvitationPreviewDto {
  studioName: string;
  invitedByName: string | null;
  invitedByEmail: string;
  role: string;
  email: string;
  fullName: string;
  expiresAt: string;
  status: string;
}

export type VerifyInvitationResponseDto = ApiSuccessResponseDto<InvitationPreviewDto>;

export interface AcceptInvitationRequestDto {
  password: string;
  confirmPassword: string;
}

export type AcceptInvitationResponseDto = ApiSuccessResponseDto<LoginResponseDataDto>;
