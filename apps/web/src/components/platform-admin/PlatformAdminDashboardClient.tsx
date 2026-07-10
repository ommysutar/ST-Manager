"use client";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import type { PlatformAdminDashboardDto } from "@st-manager/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformAdminApi } from "@/lib/platform-api-client";
import { PlatformStudiosTable } from "@/components/platform-admin/PlatformStudiosTable";

export function PlatformAdminDashboardClient() {
  const router = useRouter();
  const { isAuthenticated, logout, user } = usePlatformAuth();
  const [dashboard, setDashboard] = useState<PlatformAdminDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/platform-admin/login");
      return;
    }

    void Promise.resolve()
      .then(() => platformAdminApi.getDashboard())
      .then(setDashboard)
      .catch((err) => {
        setError(getApiErrorMessage(err, "Failed to load dashboard"));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  function handleLogout() {
    logout();
    router.replace("/platform-admin/login");
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-8 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Admin</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/platform-admin/activation-codes">Activation Codes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/platform-admin/audit-logs">Audit Log</Link>
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>

      {loading ? <p className="text-sm text-muted-foreground">Loading dashboard…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {dashboard ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Platform Overview</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{dashboard.platformStatus}</Badge>
              <span>Server time: {new Date(dashboard.serverTime).toLocaleString()}</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Total Studios" value={dashboard.totalStudios} />
            <SummaryCard title="Active Studios" value={dashboard.activeStudios} />
            <SummaryCard title="Disabled Studios" value={dashboard.disabledStudios} />
            <SummaryCard title="Archived Studios" value={dashboard.archivedStudios} />
            <SummaryCard title="Total Users" value={dashboard.totalUsers} />
            <SummaryCard title="Verified Users" value={dashboard.verifiedUsers} />
            <SummaryCard title="Activation Codes" value={dashboard.activationCodes} />
            <SummaryCard title="Used Activation Codes" value={dashboard.usedActivationCodes} />
            <SummaryCard title="Pending Activation Codes" value={dashboard.pendingActivationCodes} />
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Studio Management</h2>
        <PlatformStudiosTable />
      </section>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
