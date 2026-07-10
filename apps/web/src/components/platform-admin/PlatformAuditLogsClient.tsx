"use client";

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@st-manager/ui";
import type { PlatformAuditLogDto } from "@st-manager/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformAdminApi } from "@/lib/platform-api-client";

export function PlatformAuditLogsClient() {
  const router = useRouter();
  const { isAuthenticated } = usePlatformAuth();
  const [logs, setLogs] = useState<PlatformAuditLogDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/platform-admin/login");
      return;
    }

    void Promise.resolve()
      .then(() => platformAdminApi.listAuditLogs())
      .then(setLogs)
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load audit logs")))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 px-0">
          <Link href="/platform-admin">← Back to Platform Admin</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Platform admin actions</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Admin Email</TableHead>
              <TableHead>Studio</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No audit events yet
                </TableCell>
              </TableRow>
            ) : null}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                <TableCell>{log.actorEmail}</TableCell>
                <TableCell>{log.studioName ?? "—"}</TableCell>
                <TableCell>{log.action}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
