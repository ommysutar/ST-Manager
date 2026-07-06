"use client";

import { layout } from "@st-manager/theme";
import { Badge, Card, CardContent, CardHeader, CardTitle, cn, Input } from "@st-manager/ui";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { formatINR } from "@/lib/currency";
import { PAYMENT_STATUS_LABELS, getPaymentStatus } from "@/lib/payments/status";
import type { StudioProject } from "@/lib/projects/types";

type PaymentsTab = "all" | "projects" | "clients";

const TABS: { id: PaymentsTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "projects", label: "Projects" },
  { id: "clients", label: "Clients" },
];

function statusBadgeVariant(status: ReturnType<typeof getPaymentStatus>) {
  if (status === "paid") return "success" as const;
  if (status === "partial") return "default" as const;
  if (status === "pending") return "secondary" as const;
  return "outline" as const;
}

interface ClientAggregate {
  key: string;
  clientId?: string;
  name: string;
  mobile: string;
  email: string;
  projectCount: number;
  paid: number;
  pending: number;
}

function aggregateClients(projects: StudioProject[]): ClientAggregate[] {
  const map = new Map<string, ClientAggregate>();

  for (const project of projects) {
    const key = project.clientId ?? `${project.clientName}|${project.clientMobile ?? ""}`;
    const existing = map.get(key);
    const received = Math.max(0, project.grandTotal - project.remainingBalance);

    if (existing) {
      existing.projectCount += 1;
      existing.paid += received;
      existing.pending += project.remainingBalance;
    } else {
      map.set(key, {
        key,
        clientId: project.clientId,
        name: project.clientName,
        mobile: project.clientMobile ?? "",
        email: project.clientEmail ?? "",
        projectCount: 1,
        paid: received,
        pending: project.remainingBalance,
      });
    }
  }

  return Array.from(map.values());
}

export function PaymentsPageClient() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const projects = useProjects();
  const [tab, setTab] = useState<PaymentsTab>("all");
  const [query, setQuery] = useState("");

  const projectsWithQuotation = useMemo(
    () => projects.filter((project) => (project.quotation?.grandTotal ?? project.grandTotal) > 0 || project.grandTotal > 0),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return projectsWithQuotation;
    }
    return projectsWithQuotation.filter((project) =>
      [project.projectName, project.projectNumber, project.clientName, project.clientId, project.clientMobile, project.clientEmail]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [projectsWithQuotation, query]);

  const clientAggregates = useMemo(() => aggregateClients(projects), [projects]);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return clientAggregates;
    }
    return clientAggregates.filter((client) =>
      [client.name, client.mobile, client.email, client.clientId].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [clientAggregates, query]);

  const showProjects = tab === "all" || tab === "projects";
  const showClients = tab === "all" || tab === "clients";

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to view payments.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Financial center — search by project name/number, client name, or client ID.
        </p>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search project, project number, client name, or client ID..."
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-all",
              tab === entry.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/30",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {showProjects ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Projects</h2>
          {filteredProjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No projects match your search.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredProjects.map((project) => {
                const status = getPaymentStatus(project);
                return (
                  <Card
                    key={project.id}
                    className="cursor-pointer border-border/60 bg-background/60 backdrop-blur-md transition-colors hover:border-primary/40 dark:bg-background/30"
                    onClick={() => router.push(`/payments/${project.id}`)}
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-base">{project.projectName}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {project.projectNumber} · {project.clientName}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(status)}>{PAYMENT_STATUS_LABELS[status]}</Badge>
                    </CardHeader>
                    <CardContent className="grid gap-2 pt-0 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-muted-foreground">Project Value</p>
                        <p className="font-medium">{formatINR(project.grandTotal)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Received</p>
                        <p className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatINR(Math.max(0, project.grandTotal - project.remainingBalance))}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pending</p>
                        <p className="font-medium text-amber-600 dark:text-amber-400">
                          {formatINR(project.remainingBalance)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {showClients ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clients</h2>
          {filteredClients.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No clients match your search.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredClients.map((client) => (
                <Card
                  key={client.key}
                  className="cursor-pointer border-border/60 bg-background/60 backdrop-blur-md transition-colors hover:border-primary/40 dark:bg-background/30"
                  onClick={() =>
                    router.push(`/payments/clients/${client.clientId ?? encodeURIComponent(client.key)}`)
                  }
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{client.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {[client.mobile, client.email].filter(Boolean).join(" · ") || "No contact info"} ·{" "}
                      {client.projectCount} project{client.projectCount === 1 ? "" : "s"}
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-2 pt-0 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-medium text-emerald-600 dark:text-emerald-400">{formatINR(client.paid)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending</p>
                      <p className="font-medium text-amber-600 dark:text-amber-400">{formatINR(client.pending)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
