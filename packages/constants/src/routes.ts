/**
 * Named API resource route keys (not full URL paths), used to keep the API,
 * api-sdk, and contracts packages referring to the same resource names.
 */
export const ROUTES = {
  AUTH: "auth",
  BOOKINGS: "bookings",
  SESSIONS: "sessions",
  INVOICES: "invoices",
  REPORTS: "reports",
  CLIENTS: "clients",
  DASHBOARD: "dashboard",
  STUDIOS: "studios",
  SYNC: "sync",
  AI: "ai",
  TEAM_MEMBERS: "team-members",
  INVITATIONS: "invitations",
  PERMISSIONS: "permissions",
  PLATFORM_ADMIN: "platform-admin",
  PROFILE: "profile",
} as const;

export type RouteKey = (typeof ROUTES)[keyof typeof ROUTES];
