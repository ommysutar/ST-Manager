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
import type {
  PlatformAdminDashboardDto,
  PlatformStudioListItemDto,
} from "@st-manager/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MobileDataCard, MobileDataField, ResponsiveDataView } from "@/components/ui/ResponsiveDataView";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformAdminApi } from "@/lib/platform-api-client";

function statusVariant(status: string) {
  if (status === STUDIO_STATUSES.ACTIVE) return "success" as const;
  if (status === STUDIO_STATUSES.DISABLED) return "outline" as const;
  return "secondary" as const;
}

export function PlatformUserManagementClient() {
  const router = useRouter();
  const { isAuthenticated } = usePlatformAuth();
  const [dashboard, setDashboard] = useState<PlatformAdminDashboardDto | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PlatformStudioListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [softDeleteTarget, setSoftDeleteTarget] = useState<PlatformStudioListItemDto | null>(null);
  const [softDeleteConfirm, setSoftDeleteConfirm] = useState("");
  const [permanentTarget, setPermanentTarget] = useState<PlatformStudioListItemDto | null>(null);
  const [permanentConfirm, setPermanentConfirm] = useState("");
  const pageSize = 20;

  const loadDashboard = useCallback(async () => {
    const data = await platformAdminApi.getDashboard();
    setDashboard(data);
  }, []);

  const loadStudios = useCallback(async () => {
    setLoading(true);
    try {
      const response = await platformAdminApi.listStudios({
        search: debouncedSearch || undefined,
        page,
        pageSize,
        status: statusFilter || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      setRows(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load studios"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/platform-admin/login");
      return;
    }
    void Promise.resolve()
      .then(() => Promise.all([loadDashboard(), loadStudios()]))
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Failed to load user management"));
      });
  }, [isAuthenticated, loadDashboard, loadStudios, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function refresh() {
    await Promise.all([loadDashboard(), loadStudios()]);
  }

  async function disableStudio(studio: PlatformStudioListItemDto) {
    setBusyId(studio.id);
    try {
      await platformAdminApi.disableStudio(studio.id);
      toast.success("Studio disabled");
      await refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to disable studio"));
    } finally {
      setBusyId(null);
    }
  }

  async function enableStudio(studio: PlatformStudioListItemDto) {
    setBusyId(studio.id);
    try {
      await platformAdminApi.enableStudio(studio.id);
      toast.success("Studio enabled");
      await refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to enable studio"));
    } finally {
      setBusyId(null);
    }
  }

  async function softDeleteStudio() {
    if (!softDeleteTarget) return;
    setBusyId(softDeleteTarget.id);
    try {
      await platformAdminApi.deleteStudio(softDeleteTarget.id, { confirmation: "DELETE" });
      toast.success("Studio archived");
      setSoftDeleteTarget(null);
      setSoftDeleteConfirm("");
      await refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to archive studio"));
    } finally {
      setBusyId(null);
    }
  }

  async function permanentDeleteStudio() {
    if (!permanentTarget) return;
    setBusyId(permanentTarget.id);
    try {
      await platformAdminApi.permanentlyDeleteStudio(permanentTarget.id, {
        confirmation: "DELETE FOREVER",
      });
      toast.success("Studio permanently deleted");
      setPermanentTarget(null);
      setPermanentConfirm("");
      await refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to permanently delete studio"));
    } finally {
      setBusyId(null);
    }
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-8 p-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 px-0">
          <Link href="/platform-admin">← Back to Platform Admin</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage studio accounts, status, and permanent deletion
        </p>
      </div>

      {dashboard ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total Studios" value={dashboard.totalStudios} />
          <SummaryCard title="Active" value={dashboard.activeStudios} />
          <SummaryCard title="Disabled" value={dashboard.disabledStudios} />
          <SummaryCard title="Archived" value={dashboard.archivedStudios} />
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            className="max-w-md"
            placeholder="Search studio, owner name, or email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value={STUDIO_STATUSES.ACTIVE}>Active</option>
            <option value={STUDIO_STATUSES.DISABLED}>Disabled</option>
            <option value={STUDIO_STATUSES.ARCHIVED}>Archived</option>
          </select>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading studios…</p> : null}

        <ResponsiveDataView
          mobile={
            <>
              {rows.map((studio) => (
                <MobileDataCard
                  key={studio.id}
                  title={studio.name}
                  subtitle={studio.ownerEmail ?? "No owner"}
                  actions={
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/platform-admin/studios/${studio.id}`}>View</Link>
                    </Button>
                  }
                >
                  <MobileDataField label="Owner" value={studio.ownerName ?? "—"} />
                  <MobileDataField label="License" value={studio.licenseCode ?? "—"} />
                  <MobileDataField
                    label="Verified"
                    value={studio.verified === undefined ? "—" : studio.verified ? "Yes" : "No"}
                  />
                  <MobileDataField
                    label="Status"
                    value={<Badge variant={statusVariant(studio.status)}>{studio.status}</Badge>}
                  />
                  <StudioActions
                    studio={studio}
                    busy={busyId === studio.id}
                    onDisable={() => void disableStudio(studio)}
                    onEnable={() => void enableStudio(studio)}
                    onSoftDelete={() => {
                      setSoftDeleteConfirm("");
                      setSoftDeleteTarget(studio);
                    }}
                    onPermanentDelete={() => {
                      setPermanentConfirm("");
                      setPermanentTarget(studio);
                    }}
                  />
                </MobileDataCard>
              ))}
            </>
          }
          desktop={
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Studio</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No studios found
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {rows.map((studio) => (
                    <TableRow key={studio.id}>
                      <TableCell className="font-medium">
                        <Link
                          className="underline-offset-4 hover:underline"
                          href={`/platform-admin/studios/${studio.id}`}
                        >
                          {studio.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{studio.ownerName ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">
                            {studio.ownerEmail ?? ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{studio.licenseCode ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">
                            {[studio.licenseType, studio.licenseStatus].filter(Boolean).join(" · ") ||
                              ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {studio.verified === undefined ? "—" : studio.verified ? "Yes" : "No"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(studio.status)}>{studio.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <StudioActions
                          studio={studio}
                          busy={busyId === studio.id}
                          compact
                          onDisable={() => void disableStudio(studio)}
                          onEnable={() => void enableStudio(studio)}
                          onSoftDelete={() => {
                            setSoftDeleteConfirm("");
                            setSoftDeleteTarget(studio);
                          }}
                          onPermanentDelete={() => {
                            setPermanentConfirm("");
                            setPermanentTarget(studio);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        />

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </section>

      <Dialog
        open={Boolean(softDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setSoftDeleteTarget(null);
            setSoftDeleteConfirm("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive studio</DialogTitle>
            <DialogDescription>
              Soft-delete archives {softDeleteTarget?.name}. Type DELETE to confirm. Data is not
              permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="soft-delete-confirm">Confirmation</Label>
              <Input
                id="soft-delete-confirm"
                value={softDeleteConfirm}
                onChange={(event) => setSoftDeleteConfirm(event.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSoftDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busyId !== null || softDeleteConfirm !== "DELETE"}
                onClick={() => void softDeleteStudio()}
              >
                Archive
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(permanentTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPermanentTarget(null);
            setPermanentConfirm("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete studio</DialogTitle>
            <DialogDescription>
              This permanently removes {permanentTarget?.name} and all studio data. Type DELETE
              FOREVER to confirm. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="permanent-delete-confirm">Confirmation</Label>
              <Input
                id="permanent-delete-confirm"
                value={permanentConfirm}
                onChange={(event) => setPermanentConfirm(event.target.value)}
                placeholder="DELETE FOREVER"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPermanentTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busyId !== null || permanentConfirm !== "DELETE FOREVER"}
                onClick={() => void permanentDeleteStudio()}
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

function StudioActions({
  studio,
  busy,
  compact,
  onDisable,
  onEnable,
  onSoftDelete,
  onPermanentDelete,
}: {
  studio: PlatformStudioListItemDto;
  busy: boolean;
  compact?: boolean;
  onDisable: () => void;
  onEnable: () => void;
  onSoftDelete: () => void;
  onPermanentDelete: () => void;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "justify-end" : ""}`}>
      {studio.status === STUDIO_STATUSES.ACTIVE ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={onDisable}>
          Disable
        </Button>
      ) : null}
      {studio.status === STUDIO_STATUSES.DISABLED ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={onEnable}>
          Enable
        </Button>
      ) : null}
      {studio.status !== STUDIO_STATUSES.ARCHIVED ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={onSoftDelete}>
          Soft delete
        </Button>
      ) : null}
      <Button size="sm" variant="destructive" disabled={busy} onClick={onPermanentDelete}>
        Permanent delete
      </Button>
    </div>
  );
}
