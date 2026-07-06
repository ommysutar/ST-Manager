"use client";

import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  canAccessModule,
  canAccessPayments,
  canAccessSettings,
  canEditReports,
  canViewProfit,
  filterProjectsForUser,
  getUserRole,
  isProjectVisibleToUser,
  navHrefAllowed,
  type AppModule,
} from "@/lib/roles/permissions";
import type { StudioProject } from "@/lib/projects/types";
import type { UserRole } from "@/lib/profile/types";

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(
    () => ({
      user,
      role: getUserRole(user) as UserRole,
      canAccessModule: (module: AppModule) => canAccessModule(user, module),
      canAccessPayments: () => canAccessPayments(user),
      canAccessSettings: () => canAccessSettings(user),
      canViewProfit: () => canViewProfit(user),
      canEditReports: () => canEditReports(user),
      isProjectVisible: (project: StudioProject) => isProjectVisibleToUser(project, user),
      filterProjects: (projects: StudioProject[]) => filterProjectsForUser(projects, user),
      navHrefAllowed: (href: string) => navHrefAllowed(user, href),
    }),
    [user],
  );
}
