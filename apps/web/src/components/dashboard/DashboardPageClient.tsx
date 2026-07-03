"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { DashboardSummaryDataDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import { dashboardApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatPercent(value: number): string {
  return `${value}%`;
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function EmptyModulePanel({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Coming in a future milestone.</p>
      </CardContent>
    </Card>
  );
}

export function DashboardPageClient() {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<DashboardSummaryDataDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );

  const canFetch = isAuthenticated && isOnline;
  const isLoading = canFetch && summary === null && error === null;

  useEffect(() => {
    function handleOnlineChange() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", handleOnlineChange);
    window.addEventListener("offline", handleOnlineChange);

    return () => {
      window.removeEventListener("online", handleOnlineChange);
      window.removeEventListener("offline", handleOnlineChange);
    };
  }, []);

  useEffect(() => {
    if (!canFetch) {
      return;
    }

    let cancelled = false;

    dashboardApi
      .getSummary()
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : "Failed to load dashboard";
          setError(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch]);

  const studioCount = canFetch ? (summary?.studioCount ?? 0) : 0;

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          At-a-glance view of your studio operations.
        </p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Sign in to view dashboard KPIs and recent activity.
            </p>
          </CardContent>
        </Card>
      ) : !isOnline ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Dashboard requires an internet connection to load live aggregates.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Studios" value={String(studioCount)} hint="Live from your workspace" />
            <KpiCard
              label="Clients"
              value={String(summary?.clientCount ?? 0)}
              hint="Live client contacts"
            />
            <KpiCard
              label="Month revenue"
              value={formatCurrency(summary?.monthRevenue ?? 0)}
              hint="Available after billing (M18)"
            />
            <KpiCard
              label="Utilization"
              value={formatPercent(summary?.utilizationPercent ?? 0)}
              hint="Available after booking calendar (M16)"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent studios</CardTitle>
              <CardDescription>
                Latest studios in your workspace.{" "}
                <Link href="/studios" className="text-primary underline-offset-4 hover:underline">
                  Manage studios
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canFetch && summary && summary.recentStudios.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {summary.recentStudios.map((studio) => (
                    <li key={studio.id} className="text-sm">
                      <span className="font-medium">{studio.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — added {new Date(studio.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No studios yet.{" "}
                  <Link href="/studios" className="text-primary underline-offset-4 hover:underline">
                    Create your first studio
                  </Link>
                  .
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent clients</CardTitle>
              <CardDescription>
                Latest clients in your workspace.{" "}
                <Link href="/clients" className="text-primary underline-offset-4 hover:underline">
                  Manage clients
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canFetch && summary && summary.recentClients.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {summary.recentClients.map((client) => (
                    <li key={client.id} className="text-sm">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {client.company ?? "No company"} · added{" "}
                        {new Date(client.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No clients yet.{" "}
                  <Link href="/clients/new" className="text-primary underline-offset-4 hover:underline">
                    Add your first client
                  </Link>
                  .
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <EmptyModulePanel
              title="Today's bookings"
              description="Schedule overview for the current day."
            />
            <EmptyModulePanel
              title="Calendar"
              description="Studio booking calendar and availability."
            />
            <EmptyModulePanel
              title="Sessions"
              description="Sessions in progress and completed today."
            />
            <EmptyModulePanel
              title="Billing"
              description="Outstanding invoices and payments this month."
            />
            <EmptyModulePanel
              title="Reports"
              description="Revenue, utilization, and client activity reports."
            />
          </div>
        </>
      )}
    </div>
  );
}
