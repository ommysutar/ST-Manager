import {
  INVITABLE_TEAM_ROLES,
  TEAM_ROLES,
  type TeamRole,
} from "@st-manager/constants";

export const INVITABLE_ROLES = INVITABLE_TEAM_ROLES;

export const ALL_TEAM_ROLES: TeamRole[] = [
  TEAM_ROLES.OWNER,
  TEAM_ROLES.MANAGER,
  TEAM_ROLES.ENGINEER,
  TEAM_ROLES.ASSISTANT,
  TEAM_ROLES.RECEPTION,
  TEAM_ROLES.ACCOUNTANT,
];

export function formatMemberStatus(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "pending":
      return "Pending Invitation";
    case "disabled":
      return "Disabled";
    default:
      return status;
  }
}

export function formatLastLogin(value: string | null): string {
  if (!value) {
    return "Never";
  }
  return new Date(value).toLocaleString();
}

export function memberInitials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
