"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@st-manager/ui";
import { STUDIO_STATUSES } from "@st-manager/constants";
import type { PlatformStudioDetailDto } from "@st-manager/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformAdminApi } from "@/lib/platform-api-client";

function statusVariant(status: string) {
  if (status === STUDIO_STATUSES.ACTIVE) return "success" as const;
  if (status === STUDIO_STATUSES.DISABLED) return "outline" as const;
  return "secondary" as const;
}

export function PlatformStudioDetailClient() {
  const params = useParams<{ id: string }>();
  const studioId = params.id;
  const router = useRouter();
  const { isAuthenticated } = usePlatformAuth();
  const [studio, setStudio] = useState<PlatformStudioDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [permanentOpen, setPermanentOpen] = useState(false);
  const [permanentConfirm, setPermanentConfirm] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await platformAdminApi.getStudio(studioId);
      setStudio(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load studio"));
    } finally {
      setLoading(false);
    }
  }, [studioId]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/platform-admin/login");
      return;
    }
    void Promise.resolve().then(() => load());
  }, [isAuthenticated, load, router]);

  async function disableStudio() {
    setBusy(true);
    try {
      await platformAdminApi.disableStudio(studioId);
      toast.success("Studio disabled");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to disable studio"));
    } finally {
      setBusy(false);
    }
  }

  async function enableStudio() {
    setBusy(true);
    try {
      await platformAdminApi.enableStudio(studioId);
      toast.success("Studio enabled");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to enable studio"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteStudio() {
    setBusy(true);
    try {
      await platformAdminApi.deleteStudio(studioId, { confirmation: "DELETE" });
      toast.success("Studio archived");
      setDeleteOpen(false);
      router.replace("/platform-admin");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete studio"));
    } finally {
      setBusy(false);
    }
  }

  async function permanentlyDeleteStudio() {
    setBusy(true);
    try {
      await platformAdminApi.permanentlyDeleteStudio(studioId, {
        confirmation: "DELETE FOREVER",
      });
      toast.success("Studio permanently deleted");
      setPermanentOpen(false);
      router.replace("/platform-admin/users");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to permanently delete studio"));
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0">
            <Link href="/platform-admin">← Back to Platform Admin</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {studio?.name ?? "Studio Detail"}
          </h1>
        </div>
        {studio ? <Badge variant={statusVariant(studio.status)}>{studio.status}</Badge> : null}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {studio ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Studio Information</CardTitle>
                <CardDescription>Workspace identity and lifecycle</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Name" value={studio.name} />
                <Row label="Status" value={studio.status} />
                <Row label="Created" value={new Date(studio.createdAt).toLocaleString()} />
                <Row
                  label="Archived"
                  value={studio.archivedAt ? new Date(studio.archivedAt).toLocaleString() : "—"}
                />
                <Row
                  label="Last Login"
                  value={studio.lastLoginAt ? new Date(studio.lastLoginAt).toLocaleString() : "—"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Owner Information</CardTitle>
                <CardDescription>Primary studio owner account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Name" value={studio.owner?.fullName ?? "—"} />
                <Row label="Email" value={studio.owner?.email ?? "—"} />
                <Row
                  label="Last Login"
                  value={
                    studio.owner?.lastLoginAt
                      ? new Date(studio.owner.lastLoginAt).toLocaleString()
                      : "—"
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>License</CardTitle>
                <CardDescription>Activation / license bound to this studio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Code" value={studio.license?.code ?? "—"} />
                <Row label="Type" value={studio.license?.licenseType ?? "—"} />
                <Row label="Status" value={studio.license?.status ?? "—"} />
                <Row
                  label="Activated"
                  value={
                    studio.license?.activatedAt
                      ? new Date(studio.license.activatedAt).toLocaleString()
                      : "—"
                  }
                />
                <Row
                  label="Expires"
                  value={
                    studio.license?.expiresAt
                      ? new Date(studio.license.expiresAt).toLocaleString()
                      : "—"
                  }
                />
                <Row
                  label="Verified"
                  value={
                    studio.license
                      ? studio.license.verified
                        ? "Yes"
                        : "No"
                      : "—"
                  }
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Users" value={String(studio.totalUsers)} />
            <MetricCard title="Total Projects" value={String(studio.totalProjects)} />
            <MetricCard title="Total Bookings" value={String(studio.totalBookings)} />
            <MetricCard title="Total Clients" value={String(studio.totalClients)} />
            <MetricCard title="Storage Used" value={studio.storageUsed} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>All users linked to this studio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studio.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.fullName ?? "—"}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell>{member.status}</TableCell>
                        <TableCell>
                          {member.lastLoginAt
                            ? new Date(member.lastLoginAt).toLocaleString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {studio.status !== STUDIO_STATUSES.ARCHIVED ? (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Platform administration controls</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {studio.status === STUDIO_STATUSES.ACTIVE ? (
                  <Button variant="destructive" disabled={busy} onClick={() => void disableStudio()}>
                    Disable Studio
                  </Button>
                ) : null}
                {studio.status === STUDIO_STATUSES.DISABLED ? (
                  <Button disabled={busy} onClick={() => void enableStudio()}>
                    Enable Studio
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setDeleteConfirm("");
                    setDeleteOpen(true);
                  }}
                >
                  Delete Studio
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => {
                    setPermanentConfirm("");
                    setPermanentOpen(true);
                  }}
                >
                  Permanent Delete
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Archived studio controls</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => {
                    setPermanentConfirm("");
                    setPermanentOpen(true);
                  }}
                >
                  Permanent Delete
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete studio</DialogTitle>
            <DialogDescription>
              Soft-delete archives this studio. Type DELETE to confirm. Data is not permanently
              removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Confirmation</Label>
              <Input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busy || deleteConfirm !== "DELETE"}
                onClick={() => void deleteStudio()}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={permanentOpen} onOpenChange={setPermanentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete studio</DialogTitle>
            <DialogDescription>
              This permanently removes the studio and all related data. Type DELETE FOREVER to
              confirm. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="permanent-confirm">Confirmation</Label>
              <Input
                id="permanent-confirm"
                value={permanentConfirm}
                onChange={(event) => setPermanentConfirm(event.target.value)}
                placeholder="DELETE FOREVER"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPermanentOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busy || permanentConfirm !== "DELETE FOREVER"}
                onClick={() => void permanentlyDeleteStudio()}
              >
                Delete forever
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
