/**
 * Granular permission keys stored in the database and enforced server-side.
 */
export const PERMISSION_KEYS = {
  CLIENTS_VIEW: "clients.view",
  CLIENTS_CREATE: "clients.create",
  CLIENTS_DELETE: "clients.delete",
  FINANCE_VIEW: "finance.view",
  FINANCE_MANAGE: "finance.manage",
  USERS_MANAGE: "users.manage",
  SETTINGS_MANAGE: "settings.manage",
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  PROJECTS_DELETE: "projects.delete",
  CALENDAR_MANAGE: "calendar.manage",
  BOOKINGS_MANAGE: "bookings.manage",
  TASKS_MANAGE: "tasks.manage",
  QUOTATIONS_MANAGE: "quotations.manage",
} as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS];

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSION_KEYS);

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  [PERMISSION_KEYS.CLIENTS_VIEW]: "View Clients",
  [PERMISSION_KEYS.CLIENTS_CREATE]: "Create Clients",
  [PERMISSION_KEYS.CLIENTS_DELETE]: "Delete Clients",
  [PERMISSION_KEYS.FINANCE_VIEW]: "View Finance",
  [PERMISSION_KEYS.FINANCE_MANAGE]: "Manage Finance",
  [PERMISSION_KEYS.USERS_MANAGE]: "Manage Users",
  [PERMISSION_KEYS.SETTINGS_MANAGE]: "Manage Settings",
  [PERMISSION_KEYS.REPORTS_VIEW]: "View Reports",
  [PERMISSION_KEYS.REPORTS_EXPORT]: "Export Reports",
  [PERMISSION_KEYS.PROJECTS_DELETE]: "Delete Projects",
  [PERMISSION_KEYS.CALENDAR_MANAGE]: "Manage Calendar",
  [PERMISSION_KEYS.BOOKINGS_MANAGE]: "Manage Bookings",
  [PERMISSION_KEYS.TASKS_MANAGE]: "Manage Tasks",
  [PERMISSION_KEYS.QUOTATIONS_MANAGE]: "Manage Quotations",
};
