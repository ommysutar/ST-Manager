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
  PROJECTS: "projects",
  INQUIRIES: "inquiries",
  PROJECT_BOOKINGS: "project-bookings",
  PAYMENTS: "payments",
  STUDIO_DOCUMENTS: "studio-documents",
  DASHBOARD: "dashboard",
  STUDIOS: "studios",
  SYNC: "sync",
  AI: "ai",
  TEAM_MEMBERS: "team-members",
  INVITATIONS: "invitations",
  PERMISSIONS: "permissions",
  PLATFORM_ADMIN: "platform-admin",
  PROFILE: "profile",
  CLIENT_PORTAL: "client-portal",
  STUDIO_SERVICES: "studio-services",
  STUDIO_ROOMS: "studio-rooms",
  BOOKING_SLOT_DEFINITIONS: "booking-slot-definitions",
  STUDIO_SETTINGS: "studio-settings",
} as const;

export type RouteKey = (typeof ROUTES)[keyof typeof ROUTES];
