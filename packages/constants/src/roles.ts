/**
 * Role identifiers. Not yet enforced anywhere — authentication and
 * authorization are deferred to milestone M10 (see ADR 0002). Defined now so
 * downstream types/contracts have a single source of truth to reference.
 */
export const ROLES = {
  OWNER: "owner",
  STAFF: "staff",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
