"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useMemo } from "react";

import { usePermissions } from "@/hooks/usePermissions";
import { useProjects } from "@/hooks/useProjects";
import { formatINR } from "@/lib/currency";
import { filterActiveProjects } from "@/lib/projects/filters";

export function PendingPaymentsWidget() {
  const projects = useProjects();
  const { filterProjects, canAccessPayments } = usePermissions();

  const pending = useMemo(() => {
    if (!canAccessPayments()) {
      return [];
    }
    return filterProjects(filterActiveProjects(projects))
      .filter((project) => project.remainingBalance > 0 && project.grandTotal > 0)
      .sort((a, b) => b.remainingBalance - a.remainingBalance)
      .slice(0, 5);
  }, [projects, filterProjects, canAccessPayments]);

  if (!canAccessPayments()) {
    return null;
  }

  return (
    <Card className="border-border/60 bg-background/60 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base">Pending Payments</CardTitle>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">All active projects are fully paid.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/payments/${project.id}`}
                  className="block rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <p className="font-medium">{project.projectName}</p>
                  <p className="text-sm text-muted-foreground">
                    {project.clientName} · Pending {formatINR(project.remainingBalance)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
