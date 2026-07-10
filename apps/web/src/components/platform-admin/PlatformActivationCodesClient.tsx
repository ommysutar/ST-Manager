"use client";

import {
  Badge,
  Button,
  Card,
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
import { ACTIVATION_CODE_STATUSES } from "@st-manager/constants";
import type {
  PlatformActivationCodeDto,
  PlatformActivationCodeSummaryDto,
} from "@st-manager/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MobileDataCard, MobileDataField, ResponsiveDataView } from "@/components/ui/ResponsiveDataView";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformAdminApi } from "@/lib/platform-api-client";

const QUANTITIES = [1, 5, 10, 25, 50] as const;

function statusVariant(status: string) {
  if (status === ACTIVATION_CODE_STATUSES.ACTIVE) return "success" as const;
  if (status === ACTIVATION_CODE_STATUSES.USED) return "secondary" as const;
  if (status === ACTIVATION_CODE_STATUSES.DISABLED) return "outline" as const;
  return "outline" as const;
}

export function PlatformActivationCodesClient() {
  const router = useRouter();
  const { isAuthenticated, logout, user } = usePlatformAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"code" | "status" | "createdAt" | "expiresAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<PlatformActivationCodeDto[]>([]);
  const [summary, setSummary] = useState<PlatformActivationCodeSummaryDto | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [quantity, setQuantity] = useState<(typeof QUANTITIES)[number]>(1);
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlatformActivationCodeDto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [detail, setDetail] = useState<PlatformActivationCodeDto | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await platformAdminApi.listActivationCodes({
        search: debouncedSearch || undefined,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });
      setRows(response.data);
      setTotal(response.meta.total);
      setSummary(response.summary);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load activation codes"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, sortBy, sortOrder]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/platform-admin/login");
      return;
    }
    void Promise.resolve().then(() => load());
  }, [isAuthenticated, load, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function toggleSort(column: typeof sortBy) {
    setPage(1);
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy code");
    }
  }

  async function handleGenerate() {
    setBusy(true);
    try {
      const result = await platformAdminApi.generateActivationCodes({
        quantity,
        expiresAt: expiresAt
          ? new Date(`${expiresAt}T23:59:59.000Z`).toISOString()
          : null,
        notes: notes.trim() || null,
      });
      toast.success(`Generated ${result.codes.length} activation code(s)`);
      setGenerateOpen(false);
      setNotes("");
      setExpiresAt("");
      setQuantity(1);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate codes"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable(id: string) {
    setBusy(true);
    try {
      await platformAdminApi.disableActivationCode(id);
      toast.success("Code disabled");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to disable code"));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnable(id: string) {
    setBusy(true);
    try {
      await platformAdminApi.enableActivationCode(id);
      toast.success("Code enabled");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to enable code"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await platformAdminApi.deleteActivationCode(deleteTarget.id, { confirmation: "DELETE" });
      toast.success("Code deleted");
      setDeleteTarget(null);
      setDeleteConfirm("");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete code"));
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    try {
      const result = await platformAdminApi.exportActivationCodes();
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to export CSV"));
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0">
            <Link href="/platform-admin">← Back to Platform Admin</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Activation Codes</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void handleExport()}>
            Export CSV
          </Button>
          <Button onClick={() => setGenerateOpen(true)}>Generate Activation Code</Button>
          <Button variant="outline" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard title="Total Codes" value={summary.totalCodes} />
          <SummaryCard title="Active" value={summary.activeCodes} />
          <SummaryCard title="Used" value={summary.usedCodes} />
          <SummaryCard title="Disabled" value={summary.disabledCodes} />
          <SummaryCard title="Expired" value={summary.expiredCodes} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="max-w-md"
          placeholder="Search code, notes, or studio…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          {total} code{total === 1 ? "" : "s"}
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      <ResponsiveDataView
        mobile={
          <>
            {rows.map((row) => (
              <MobileDataCard
                key={row.id}
                title={row.code}
                subtitle={row.status}
                actions={
                  <Button size="sm" variant="outline" onClick={() => void copyCode(row.code)}>
                    Copy
                  </Button>
                }
              >
                <MobileDataField
                  label="Created"
                  value={new Date(row.createdAt).toLocaleDateString()}
                />
                <MobileDataField
                  label="Expires"
                  value={row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "—"}
                />
                <MobileDataField
                  label="Used By Studio"
                  value={row.usedByStudioName ?? "—"}
                />
                <MobileDataField
                  label="Owner Email"
                  value={row.usedByOwnerEmail ?? "—"}
                />
                <MobileDataField
                  label="Used Date"
                  value={row.usedAt ? new Date(row.usedAt).toLocaleString() : "—"}
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
                  <TableHead>
                    <button type="button" className="font-medium" onClick={() => toggleSort("code")}>
                      Activation Code
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="font-medium" onClick={() => toggleSort("status")}>
                      Status
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="font-medium" onClick={() => toggleSort("createdAt")}>
                      Created
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="font-medium" onClick={() => toggleSort("expiresAt")}>
                      Expires
                    </button>
                  </TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No activation codes yet
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {row.status === ACTIVATION_CODE_STATUSES.USED ? (
                        <div className="space-y-0.5">
                          <div>{row.usedByStudioName ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.usedByOwnerEmail ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.usedAt ? new Date(row.usedAt).toLocaleString() : "—"}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => void copyCode(row.code)}>
                        Copy
                      </Button>
                      {row.status === ACTIVATION_CODE_STATUSES.USED ? (
                        <Button size="sm" variant="outline" onClick={() => setDetail(row)}>
                          View
                        </Button>
                      ) : null}
                      {row.status === ACTIVATION_CODE_STATUSES.ACTIVE ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleDisable(row.id)}
                        >
                          Disable
                        </Button>
                      ) : null}
                      {row.status === ACTIVATION_CODE_STATUSES.DISABLED ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleEnable(row.id)}
                        >
                          Enable
                        </Button>
                      ) : null}
                      {row.status !== ACTIVATION_CODE_STATUSES.USED ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => {
                            setDeleteConfirm("");
                            setDeleteTarget(row);
                          }}
                        >
                          Delete
                        </Button>
                      ) : null}
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

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Activation Code</DialogTitle>
            <DialogDescription>
              Create secure STM-XXXX-XXXX-XXXX codes. Registration does not require them yet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <select
                id="quantity"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={quantity}
                onChange={(event) =>
                  setQuantity(Number(event.target.value) as (typeof QUANTITIES)[number])
                }
              >
                {QUANTITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Optional Expiry Date</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Optional Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Internal note"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGenerateOpen(false)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void handleGenerate()}>
                Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirm("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete activation code</DialogTitle>
            <DialogDescription>
              Type DELETE to permanently remove {deleteTarget?.code}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="DELETE"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busy || deleteConfirm !== "DELETE"}
                onClick={() => void handleDelete()}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Used activation code</DialogTitle>
            <DialogDescription>Read-only details for a redeemed code.</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Code:</span> {detail.code}
              </p>
              <p>
                <span className="text-muted-foreground">Studio Name:</span>{" "}
                {detail.usedByStudioName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Owner Email:</span>{" "}
                {detail.usedByOwnerEmail ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Used Date:</span>{" "}
                {detail.usedAt ? new Date(detail.usedAt).toLocaleString() : "—"}
              </p>
            </div>
          ) : null}
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
    </Card>
  );
}
