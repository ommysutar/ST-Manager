import type {
  InvitationPreviewDto,
  PendingInvitationResponseDto,
  PermissionResponseDto,
  RoleDefinitionResponseDto,
  TeamMemberListItemDto,
  TeamMemberResponseDto,
} from "@st-manager/contracts";

import type { InvitationRecord, PermissionRecord, RoleDefinitionRecord, UserMemberRecord } from "./team.repository";

function parseCustomPermissions(value: unknown): string[] | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return null;
}

export function toTeamMemberDto(user: UserMemberRecord): TeamMemberResponseDto {
  return {
    id: user.id,
    type: "member",
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    customPermissions: parseCustomPermissions(user.customPermissions),
    createdAt: user.createdAt.toISOString(),
  };
}

export function toPendingInvitationDto(invitation: InvitationRecord): PendingInvitationResponseDto {
  return {
    id: invitation.id,
    type: "invitation",
    fullName: invitation.fullName,
    email: invitation.email,
    phone: invitation.phone,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    customPermissions: parseCustomPermissions(invitation.customPermissions),
    createdAt: invitation.createdAt.toISOString(),
  };
}

export function toTeamMemberList(
  members: UserMemberRecord[],
  invitations: InvitationRecord[],
): TeamMemberListItemDto[] {
  return [...members.map(toTeamMemberDto), ...invitations.map(toPendingInvitationDto)];
}

export function toPermissionDto(permission: PermissionRecord): PermissionResponseDto {
  return {
    key: permission.key,
    label: permission.label,
    category: permission.category,
  };
}

export function toRoleDefinitionDto(role: RoleDefinitionRecord): RoleDefinitionResponseDto {
  return {
    name: role.name,
    label: role.label,
    isSystem: role.isSystem,
    permissions: role.permissions.map((rp) => rp.permission.key),
  };
}

export function toInvitationPreviewDto(
  invitation: InvitationRecord,
  options?: { status?: string; accountExists?: boolean; canAccept?: boolean },
): InvitationPreviewDto {
  const status = options?.status ?? invitation.status;
  const canAccept =
    options?.canAccept ??
    (status === "pending" && invitation.expiresAt.getTime() >= Date.now());

  return {
    studioName: invitation.studio?.name ?? "Studio",
    invitedByName: invitation.invitedBy?.fullName ?? null,
    invitedByEmail: invitation.invitedBy?.email ?? "",
    role: invitation.role,
    email: invitation.email,
    fullName: invitation.fullName,
    expiresAt: invitation.expiresAt.toISOString(),
    status,
    accountExists: options?.accountExists ?? false,
    canAccept,
  };
}
