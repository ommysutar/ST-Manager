export interface TeamMemberResponseDto {
  id: string;
  type: "member";
  fullName: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  customPermissions: string[] | null;
  createdAt: string;
}

export interface PendingInvitationResponseDto {
  id: string;
  type: "invitation";
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  expiresAt: string;
  customPermissions: string[] | null;
  createdAt: string;
}

export type TeamMemberListItemDto = TeamMemberResponseDto | PendingInvitationResponseDto;

export interface ListTeamMembersResponseDto {
  success: true;
  data: TeamMemberListItemDto[];
}

export interface InviteTeamMemberRequestDto {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  customPermissions?: string[];
}

export interface InviteTeamMemberResponseDto {
  success: true;
  data: PendingInvitationResponseDto;
}

export interface UpdateTeamMemberRequestDto {
  fullName?: string;
  phone?: string | null;
  role?: string;
  customPermissions?: string[] | null;
}

export interface UpdateTeamMemberResponseDto {
  success: true;
  data: TeamMemberResponseDto;
}

export interface DisableTeamMemberResponseDto {
  success: true;
  data: TeamMemberResponseDto;
}

export interface EnableTeamMemberResponseDto {
  success: true;
  data: TeamMemberResponseDto;
}

export interface ResendInvitationResponseDto {
  success: true;
  data: PendingInvitationResponseDto;
}

export interface CancelInvitationResponseDto {
  success: true;
}

export interface RemoveTeamMemberResponseDto {
  success: true;
}

export interface TransferOwnershipRequestDto {
  newOwnerUserId: string;
}

export interface TransferOwnershipResponseDto {
  success: true;
}
