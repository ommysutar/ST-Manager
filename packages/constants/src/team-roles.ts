/**
 * Default team roles for studio membership.
 */
export const TEAM_ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  ENGINEER: "engineer",
  ASSISTANT: "assistant",
  RECEPTION: "reception",
  ACCOUNTANT: "accountant",
} as const;

export type TeamRole = (typeof TEAM_ROLES)[keyof typeof TEAM_ROLES];

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  [TEAM_ROLES.OWNER]: "Owner",
  [TEAM_ROLES.MANAGER]: "Manager",
  [TEAM_ROLES.ENGINEER]: "Engineer",
  [TEAM_ROLES.ASSISTANT]: "Assistant",
  [TEAM_ROLES.RECEPTION]: "Reception",
  [TEAM_ROLES.ACCOUNTANT]: "Accountant",
};

export const INVITABLE_TEAM_ROLES: TeamRole[] = [
  TEAM_ROLES.MANAGER,
  TEAM_ROLES.ENGINEER,
  TEAM_ROLES.ASSISTANT,
  TEAM_ROLES.RECEPTION,
  TEAM_ROLES.ACCOUNTANT,
];

export const MEMBER_STATUSES = {
  ACTIVE: "active",
  PENDING: "pending",
  DISABLED: "disabled",
} as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[keyof typeof MEMBER_STATUSES];

export const INVITATION_STATUSES = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
} as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[keyof typeof INVITATION_STATUSES];

export const AUDIT_ACTIONS = {
  MEMBER_INVITED: "member.invited",
  MEMBER_ACCEPTED: "member.accepted",
  ROLE_CHANGED: "member.role_changed",
  PERMISSION_UPDATED: "member.permission_updated",
  MEMBER_DISABLED: "member.disabled",
  MEMBER_ENABLED: "member.enabled",
  MEMBER_REMOVED: "member.removed",
  INVITATION_RESENT: "invitation.resent",
  INVITATION_CANCELLED: "invitation.cancelled",
  OWNERSHIP_TRANSFERRED: "studio.ownership_transferred",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
