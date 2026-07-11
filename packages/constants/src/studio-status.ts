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
  PLATFORM_ADMIN_PROFILE_UPDATED: "platform_admin.profile_updated",
  STUDIO_DISABLED: "studio.disabled",
  STUDIO_ENABLED: "studio.enabled",
  STUDIO_DELETED: "studio.deleted",
  STUDIO_PERMANENTLY_DELETED: "studio.permanently_deleted",
  STUDIO_ACTIVATED: "studio.activated",
  ACTIVATION_CODE_GENERATED: "activation_code.generated",
  ACTIVATION_CODE_VALIDATED: "activation_code.validated",
  ACTIVATION_CODE_USED: "activation_code.used",
  ACTIVATION_CODE_DISABLED: "activation_code.disabled",
  ACTIVATION_CODE_ENABLED: "activation_code.enabled",
  ACTIVATION_CODE_DELETED: "activation_code.deleted",
  LICENSE_GENERATED: "license.generated",
  LICENSE_DISABLED: "license.disabled",
  LICENSE_ENABLED: "license.enabled",
  LICENSE_REVOKED: "license.revoked",
  LICENSE_DELETED: "license.deleted",
  LICENSE_DUPLICATED: "license.duplicated",
} as const;

export const ACTIVATION_CODE_ERROR_MESSAGES = {
  INVALID: "Invalid code",
  USED: "Code already used",
  DISABLED: "Code disabled",
  EXPIRED: "Code expired",
  REVOKED: "Code revoked",
} as const;

export type PlatformAuditAction =
  (typeof PLATFORM_AUDIT_ACTIONS)[keyof typeof PLATFORM_AUDIT_ACTIONS];

export const ACTIVATION_CODE_STATUSES = {
  ACTIVE: "ACTIVE",
  USED: "USED",
  DISABLED: "DISABLED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;

export type ActivationCodeStatus =
  (typeof ACTIVATION_CODE_STATUSES)[keyof typeof ACTIVATION_CODE_STATUSES];
