import type { ApiSuccessResponseDto } from "../common/success-response.dto";

export interface InvitationPreviewDto {
  studioName: string;
  invitedByName: string | null;
  invitedByEmail: string;
  role: string;
  email: string;
  fullName: string;
  expiresAt: string;
  status: string;
  accountExists: boolean;
  canAccept: boolean;
}

export type VerifyInvitationResponseDto = ApiSuccessResponseDto<InvitationPreviewDto>;

export interface AcceptInvitationRequestDto {
  password: string;
  confirmPassword: string;
}

export interface AcceptInvitationResultDto {
  message: string;
}

export type AcceptInvitationResponseDto = ApiSuccessResponseDto<AcceptInvitationResultDto>;

export type CompleteInvitationResponseDto = ApiSuccessResponseDto<{ message: string }>;
