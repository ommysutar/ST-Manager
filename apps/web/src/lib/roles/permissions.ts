import type { AuthUserDto } from "@st-manager/contracts";

import { getPrimaryEngineer } from "@/lib/projects/progress";
import type { StudioProject } from "@/lib/projects/types";
import { normalizeRole } from "@/lib/profile/storage";
import type { UserRole } from "@/lib/profile/types";

export type AppModule =
  | "dashboard"
  | "inquiries"
  | "projects"
  | "clients"
  | "bookings"
  | "payments"
  | "reports"
  | "settings"
  | "profit";

const OWNER_MODULES: AppModule[] = [
  "dashboard",
  "inquiries",
  "projects",
  "clients",
  "bookings",
  "payments",
  "reports",
  "settings",
  "profit",
];

const ASSISTANT_MODULES: AppModule[] = [
  "dashboard",
  "inquiries",
  "projects",
  "clients",
  "bookings",
  "payments",
  "reports",
];

const ENGINEER_MODULES: AppModule[] = ["dashboard", "projects", "bookings"];

export function getUserRole(user: AuthUserDto | null | undefined): UserRole {
  if (!user) {
    return "owner";
  }
  return normalizeRole(user.role);
}

export function canAccessModule(user: AuthUserDto | null | undefined, module: AppModule): boolean {
  const role = getUserRole(user);
  if (role === "owner") {
    return OWNER_MODULES.includes(module);
  }
  if (role === "assistant") {
    return ASSISTANT_MODULES.includes(module);
  }
  return ENGINEER_MODULES.includes(module);
}

/** Owner-only profit figures and expense internals. */
export function canViewProfit(user: AuthUserDto | null | undefined): boolean {
  return getUserRole(user) === "owner";
}

/** Assistant and engineer cannot export or mutate report configuration. */
export function canEditReports(user: AuthUserDto | null | undefined): boolean {
  return getUserRole(user) === "owner";
}

export function canAccessSettings(user: AuthUserDto | null | undefined): boolean {
  return getUserRole(user) === "owner";
}

export function canAccessPayments(user: AuthUserDto | null | undefined): boolean {
  const role = getUserRole(user);
  return role === "owner" || role === "assistant";
}

/** Engineers only see projects they are assigned to. */
export function isProjectVisibleToUser(
  project: StudioProject,
  user: AuthUserDto | null | undefined,
): boolean {
  const role = getUserRole(user);
  if (role !== "engineer") {
    return true;
  }

  if (!user) {
    return false;
  }

  const identifiers = [
    user.email.toLowerCase(),
    user.email.split("@")[0]?.toLowerCase() ?? "",
    "engineer",
  ];

  const assignees = [
    project.assignedEngineer.toLowerCase(),
    getPrimaryEngineer(project).toLowerCase(),
    ...project.tasks.map((task) => (task.assignedEngineer ?? "").toLowerCase()),
  ];

  return identifiers.some((id) => assignees.some((assignee) => assignee.includes(id)));
}

export function filterProjectsForUser(
  projects: StudioProject[],
  user: AuthUserDto | null | undefined,
): StudioProject[] {
  return projects.filter((project) => isProjectVisibleToUser(project, user));
}

export function navHrefAllowed(
  user: AuthUserDto | null | undefined,
  href: string,
): boolean {
  const role = getUserRole(user);

  if (href === "/") {
    return canAccessModule(user, "dashboard");
  }
  if (href.startsWith("/projects")) {
    return canAccessModule(user, "projects");
  }
  if (href.startsWith("/inquiries")) {
    return role === "owner" || role === "assistant";
  }
  if (href.startsWith("/clients")) {
    return role === "owner" || role === "assistant";
  }
  if (href.startsWith("/bookings")) {
    return canAccessModule(user, "bookings");
  }
  if (href.startsWith("/payments")) {
    return canAccessPayments(user);
  }
  if (href.startsWith("/reports")) {
    return canAccessModule(user, "reports");
  }
  if (href.startsWith("/settings")) {
    return canAccessSettings(user);
  }
  return true;
}
