"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useMemo } from "react";

import { RequireModule } from "@/components/roles/AccessDenied";
import { usePermissions } from "@/hooks/usePermissions";
import { useProject } from "@/hooks/useProjects";
import { formatINR } from "@/lib/currency";
import { buildProjectReport } from "@/lib/reports/aggregators";
import { getDefaultReportFilters } from "@/lib/reports/filters";

export function ProjectReportPageClient({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const { canViewProfit, isProjectVisible } = usePermissions();
  const filters = useMemo(() => getDefaultReportFilters(), []);

  const report = useMemo(
    () => (project ? buildProjectReport(project, filters) : null),
    [project, filters],
  );

  if (!project) {
    return (
      <RequireModule module="reports">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </RequireModule>
    );
  }

  if (!isProjectVisible(project)) {
    return (
      <RequireModule module="reports">
        <p className="text-sm text-muted-foreground">You do not have access to this project report.</p>
      </RequireModule>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <RequireModule module="reports">
      <div className="page-container flex flex-col gap-6">
        <div>
          <Link href="/reports" className="text-sm text-primary underline-offset-4 hover:underline">
            Back to reports
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {report.projectNumber} · {report.projectName}
          </h1>
          <p className="text-sm text-muted-foreground">Project report — {report.clientName}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Project value</CardDescription>
              <CardTitle className="text-xl">{formatINR(report.projectValue)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Payments received</CardDescription>
              <CardTitle className="text-xl">{formatINR(report.paymentsReceived)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending payments</CardDescription>
              <CardTitle className="text-xl">{formatINR(report.pendingPayments)}</CardTitle>
            </CardHeader>
          </Card>
          {canViewProfit() ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Project expenses</CardDescription>
                  <CardTitle className="text-xl">{formatINR(report.projectExpenses)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Net profit</CardDescription>
                  <CardTitle className="text-xl">{formatINR(report.netProfit)}</CardTitle>
                </CardHeader>
              </Card>
            </>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Assigned engineer:</span> {report.assignedEngineer}
            </p>
            <p>
              <span className="text-muted-foreground">Bookings:</span> {report.bookingCount}
            </p>
            <p>
              <span className="text-muted-foreground">Files shared:</span>{" "}
              {report.filesShared ? "Yes" : "No"}
            </p>
            <p>
              <span className="text-muted-foreground">Completion:</span>{" "}
              {report.completionDate
                ? new Date(`${report.completionDate}T12:00:00`).toLocaleDateString()
                : "In progress"}
            </p>
          </CardContent>
        </Card>

        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Open project workspace
        </Link>
      </div>
    </RequireModule>
  );
}
