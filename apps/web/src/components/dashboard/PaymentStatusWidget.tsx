"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";

import { useProjects } from "@/hooks/useProjects";
import { formatINR } from "@/lib/currency";
import { PAYMENT_STATUS_LABELS, getPaymentStatus } from "@/lib/payments/status";
import { filterActiveProjects } from "@/lib/projects/filters";

export function PaymentStatusWidget() {
  const projects = useProjects();

  const pendingProjects = filterActiveProjects(projects)
    .filter((project) => project.grandTotal > 0 && project.remainingBalance > 0)
    .slice(0, 5);

  if (pendingProjects.length === 0) {
    return (
      <Card className="border-border/60 bg-background/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base">Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No unpaid or partially paid active projects.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-background/60 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base">Payment Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingProjects.map((project) => {
          const status = getPaymentStatus(project);
          return (
            <Link
              key={project.id}
              href={`/payments/${project.id}`}
              className="block rounded-xl border border-border/60 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{project.projectName}</p>
                  <p className="text-sm text-muted-foreground">{project.clientName}</p>
                </div>
                <Badge variant={status === "partial" ? "default" : "secondary"}>
                  {PAYMENT_STATUS_LABELS[status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                Pending: {formatINR(project.remainingBalance)}
              </p>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
