export const STUDIO_STATUSES = {
  ACTIVE: "active",
  DISABLED: "disabled",
  ARCHIVED: "archived",
} as const;

export type StudioStatus = (typeof STUDIO_STATUSES)[keyof typeof STUDIO_STATUSES];

export const STUDIO_STATUS_LABELS: Record<StudioStatus, string> = {
  [STUDIO_STATUSES.ACTIVE]: "Active",
  [STUDIO_STATUSES.DISABLED]: "Disabled",
  [STUDIO_STATUSES.ARCHIVED]: "Archived",
};

export const DISABLED_STUDIO_MESSAGE =
  "This Studio has been disabled. Contact ST Manager Support.";

export const PLATFORM_AUDIT_ACTIONS = {
  PLATFORM_ADMIN_LOGIN: "platform_admin.login",
  STUDIO_DISABLED: "studio.disabled",
  STUDIO_ENABLED: "studio.enabled",
  STUDIO_DELETED: "studio.deleted",
} as const;

export type PlatformAuditAction =
  (typeof PLATFORM_AUDIT_ACTIONS)[keyof typeof PLATFORM_AUDIT_ACTIONS];
