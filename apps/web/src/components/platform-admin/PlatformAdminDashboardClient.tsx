"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import type { PlatformAdminDashboardDto } from "@st-manager/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformAdminApi } from "@/lib/platform-api-client";

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

    void platformAdminApi
      .getDashboard()
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
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Admin</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Sign out
        </Button>
      </header>

      {loading ? <p className="text-sm text-muted-foreground">Loading dashboard…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {dashboard ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Total Studios</CardTitle>
              <CardDescription>Registered studio workspaces</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{dashboard.totalStudios}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
              <CardDescription>All platform user accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{dashboard.totalUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Platform Status</CardTitle>
              <CardDescription>Current operational state</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold capitalize">{dashboard.platformStatus}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Server Time</CardTitle>
              <CardDescription>UTC timestamp from the API</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{new Date(dashboard.serverTime).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
