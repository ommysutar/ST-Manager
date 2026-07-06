"use client";

import { Button } from "@st-manager/ui";
import { FolderPlusIcon, PlusCircleIcon } from "lucide-react";
import Link from "next/link";

import { AssignedTasksWidget } from "@/components/dashboard/AssignedTasksWidget";
import { BookingsWidget } from "@/components/dashboard/BookingsWidget";
import { PendingPaymentsWidget } from "@/components/dashboard/PendingPaymentsWidget";
import { PaymentStatusWidget } from "@/components/dashboard/PaymentStatusWidget";
import { ProjectStatusWidget } from "@/components/dashboard/ProjectStatusWidget";
import { RecentProjectsWidget } from "@/components/dashboard/RecentProjectsWidget";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { layout } from "@st-manager/theme";

export function DashboardPageClient() {
  const { isAuthenticated } = useAuth();
  const { role, canAccessPayments } = usePermissions();

  return (
    <div
      className="mx-auto flex flex-col gap-8"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAuthenticated
            ? role === "engineer"
              ? "Your assigned projects and tasks."
              : "Start a new inquiry or create a project manually."
            : "Sign in to manage studio inquiries and projects."}
        </p>
      </div>

      {isAuthenticated && role !== "engineer" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Button
            asChild
            size="lg"
            className="h-auto min-h-24 flex-col gap-2 py-6 text-base"
          >
            <Link href="/inquiries/new">
              <PlusCircleIcon className="size-6" />
              + New Inquiry
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-auto min-h-24 flex-col gap-2 py-6 text-base"
          >
            <Link href="/projects/new">
              <FolderPlusIcon className="size-6" />
              + New Project
            </Link>
          </Button>
        </div>
      ) : null}

      {isAuthenticated ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ProjectStatusWidget />
          {canAccessPayments() ? <PendingPaymentsWidget /> : <AssignedTasksWidget />}
          <BookingsWidget />
          <RecentProjectsWidget />
          {canAccessPayments() ? <PaymentStatusWidget /> : null}
          {role !== "engineer" && canAccessPayments() ? <AssignedTasksWidget /> : null}
        </div>
      ) : null}
    </div>
  );
}
