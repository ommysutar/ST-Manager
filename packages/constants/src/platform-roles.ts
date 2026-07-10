export const PLATFORM_ROLES = {
  PLATFORM_ADMIN: "platform_admin",
} as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  [PLATFORM_ROLES.PLATFORM_ADMIN]: "Platform Admin",
};
