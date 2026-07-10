export const LICENSE_TYPES = {
  LIFETIME: "LIFETIME",
  TRIAL: "TRIAL",
  SUBSCRIPTION: "SUBSCRIPTION",
} as const;

export type LicenseType = (typeof LICENSE_TYPES)[keyof typeof LICENSE_TYPES];

export const LICENSE_SUBSCRIPTION_MONTHS = [1, 3, 6, 12] as const;
export type LicenseSubscriptionMonths = (typeof LICENSE_SUBSCRIPTION_MONTHS)[number];

export const LICENSE_STATUSES = {
  PENDING: "PENDING",
  ACTIVATED: "ACTIVATED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  DISABLED: "DISABLED",
} as const;

export type LicenseStatus = (typeof LICENSE_STATUSES)[keyof typeof LICENSE_STATUSES];

/** Wire/DB values used by activation_codes.status (backward compatible). */
export const LICENSE_STATUS_TO_WIRE: Record<LicenseStatus, string> = {
  PENDING: "ACTIVE",
  ACTIVATED: "USED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  DISABLED: "DISABLED",
};

export const WIRE_STATUS_TO_LICENSE: Record<string, LicenseStatus> = {
  ACTIVE: "PENDING",
  PENDING: "PENDING",
  USED: "ACTIVATED",
  ACTIVATED: "ACTIVATED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  DISABLED: "DISABLED",
};

export const LICENSE_GENERATE_QUANTITIES = [1, 5, 10, 25, 50, 100] as const;

export const TRIAL_DEFAULT_DAYS = 30;
