"use client";

import { Button } from "@st-manager/ui";
import { FolderPlusIcon, PlusCircleIcon } from "lucide-react";
import Link from "next/link";

import { NewInquiryLink } from "@/components/inquiry/NewInquiryLink";
import { AssignedTasksWidget } from "@/components/dashboard/AssignedTasksWidget";
import { BookingsWidget } from "@/components/dashboard/BookingsWidget";
import { PendingPaymentsWidget } from "@/components/dashboard/PendingPaymentsWidget";
import { PaymentStatusWidget } from "@/components/dashboard/PaymentStatusWidget";
import { ProjectStatusWidget } from "@/components/dashboard/ProjectStatusWidget";
import { RecentProjectsWidget } from "@/components/dashboard/RecentProjectsWidget";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

export function DashboardPageClient() {
  const { isAuthenticated } = useAuth();
  const { role, canAccessPayments } = usePermissions();

  return (
    <div className="page-container flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
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
            className="h-auto min-h-[5.5rem] w-full flex-col gap-2 py-6 text-base"
          >
            <NewInquiryLink>
              <PlusCircleIcon className="size-6" />
              + New Inquiry
            </NewInquiryLink>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-auto min-h-[5.5rem] w-full flex-col gap-2 py-6 text-base"
          >
            <Link href="/projects/new">
              <FolderPlusIcon className="size-6" />
              + New Project
            </Link>
          </Button>
        </div>
      ) : null}

      {isAuthenticated ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
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
