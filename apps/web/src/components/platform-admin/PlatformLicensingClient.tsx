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
import {
  LICENSE_GENERATE_QUANTITIES,
  LICENSE_STATUSES,
  LICENSE_SUBSCRIPTION_MONTHS,
  LICENSE_TYPES,
} from "@st-manager/constants";
import type { PlatformLicenseDto, PlatformLicenseSummaryDto } from "@st-manager/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MobileDataCard, MobileDataField, ResponsiveDataView } from "@/components/ui/ResponsiveDataView";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformAdminApi } from "@/lib/platform-api-client";

type LicenseTypeOption = (typeof LICENSE_TYPES)[keyof typeof LICENSE_TYPES];
type QuantityOption = (typeof LICENSE_GENERATE_QUANTITIES)[number];
type MonthsOption = (typeof LICENSE_SUBSCRIPTION_MONTHS)[number];

function statusVariant(status: string) {
  if (status === LICENSE_STATUSES.PENDING) return "success" as const;
  if (status === LICENSE_STATUSES.ACTIVATED) return "secondary" as const;
  if (status === LICENSE_STATUSES.DISABLED) return "outline" as const;
  if (status === LICENSE_STATUSES.REVOKED) return "default" as const;
  return "outline" as const;
}

export function PlatformLicensingClient() {
  const router = useRouter();
  const { isAuthenticated, logout, user } = usePlatformAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"code" | "status" | "createdAt" | "expiresAt" | "licenseType">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<PlatformLicenseDto[]>([]);
  const [summary, setSummary] = useState<PlatformLicenseSummaryDto | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [quantity, setQuantity] = useState<QuantityOption>(1);
  const [licenseType, setLicenseType] = useState<LicenseTypeOption>(LICENSE_TYPES.LIFETIME);
  const [subscriptionMonths, setSubscriptionMonths] = useState<MonthsOption>(1);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlatformLicenseDto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [detail, setDetail] = useState<PlatformLicenseDto | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await platformAdminApi.listLicenses({
        search: debouncedSearch || undefined,
        page,
        pageSize,
        sortBy,
        sortOrder,
        status: statusFilter || undefined,
        licenseType: typeFilter || undefined,
      });
      setRows(response.data);
      setTotal(response.meta.total);
      setSummary(response.summary);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load licenses"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, sortBy, sortOrder, statusFilter, typeFilter]);

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
      const result = await platformAdminApi.generateLicenses({
        quantity,
        licenseType,
        subscriptionMonths:
          licenseType === LICENSE_TYPES.SUBSCRIPTION ? subscriptionMonths : null,
        customerName: customerName.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success(`Generated ${result.licenses.length} license(s)`);
      setGenerateOpen(false);
      setNotes("");
      setCustomerName("");
      setPhone("");
      setQuantity(1);
      setLicenseType(LICENSE_TYPES.LIFETIME);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate licenses"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable(id: string) {
    setBusy(true);
    try {
      await platformAdminApi.disableLicense(id);
      toast.success("License disabled");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to disable license"));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnable(id: string) {
    setBusy(true);
    try {
      await platformAdminApi.enableLicense(id);
      toast.success("License enabled");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to enable license"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    setBusy(true);
    try {
      await platformAdminApi.revokeLicense(id);
      toast.success("License revoked");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to revoke license"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(id: string) {
    setBusy(true);
    try {
      await platformAdminApi.duplicateLicense(id);
      toast.success("License duplicated");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to duplicate license"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await platformAdminApi.deleteLicense(deleteTarget.id, { confirmation: "DELETE" });
      toast.success("License deleted");
      setDeleteTarget(null);
      setDeleteConfirm("");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete license"));
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    try {
      const result = await platformAdminApi.exportLicenses();
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
          <h1 className="text-2xl font-semibold tracking-tight">Licensing</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void handleExport()}>
            Export CSV
          </Button>
          <Button onClick={() => setGenerateOpen(true)}>Generate Licenses</Button>
          <Button variant="outline" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total" value={summary.total} />
          <SummaryCard title="Pending" value={summary.active} />
          <SummaryCard title="Activated" value={summary.used} />
          <SummaryCard title="Expired" value={summary.expired} />
          <SummaryCard title="Revoked" value={summary.revoked} />
          <SummaryCard title="Disabled" value={summary.disabled} />
          <SummaryCard title="Lifetime" value={summary.lifetime} />
          <SummaryCard title="Trial" value={summary.trial} />
          <Card className="sm:col-span-2">
            <CardHeader className="pb-2">
              <CardDescription>Revenue</CardDescription>
              <CardTitle className="text-lg">{summary.revenuePlaceholder}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Input
          className="max-w-md"
          placeholder="Search code, studio, owner, customer…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Pending</option>
            <option value="USED">Activated</option>
            <option value="EXPIRED">Expired</option>
            <option value="REVOKED">Revoked</option>
            <option value="DISABLED">Disabled</option>
          </select>
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value={LICENSE_TYPES.LIFETIME}>Lifetime</option>
            <option value={LICENSE_TYPES.TRIAL}>Trial</option>
            <option value={LICENSE_TYPES.SUBSCRIPTION}>Subscription</option>
          </select>
          <p className="text-sm text-muted-foreground">
            {total} license{total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      <ResponsiveDataView
        mobile={
          <>
            {rows.map((row) => (
              <MobileDataCard
                key={row.id}
                title={row.code}
                subtitle={`${row.status} · ${row.licenseType}`}
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
                <MobileDataField label="Customer" value={row.customerName ?? "—"} />
                <MobileDataField label="Studio" value={row.usedByStudioName ?? "—"} />
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
                      License Code
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="font-medium" onClick={() => toggleSort("status")}>
                      Status
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="font-medium"
                      onClick={() => toggleSort("licenseType")}
                    >
                      Type
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="font-medium"
                      onClick={() => toggleSort("createdAt")}
                    >
                      Created
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="font-medium"
                      onClick={() => toggleSort("expiresAt")}
                    >
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
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No licenses yet
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.licenseType}
                      {row.subscriptionMonths ? ` (${row.subscriptionMonths}m)` : ""}
                    </TableCell>
                    <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {row.status === LICENSE_STATUSES.ACTIVATED ||
                      row.status === LICENSE_STATUSES.REVOKED ? (
                        <div className="space-y-0.5">
                          <div>{row.usedByStudioName ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.usedByOwnerEmail ?? "—"}
                          </div>
                        </div>
                      ) : (
                        row.customerName ?? "—"
                      )}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button size="sm" variant="outline" onClick={() => void copyCode(row.code)}>
                        Copy
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDetail(row)}>
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void handleDuplicate(row.id)}
                      >
                        Duplicate
                      </Button>
                      {row.status === LICENSE_STATUSES.PENDING ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleDisable(row.id)}
                        >
                          Disable
                        </Button>
                      ) : null}
                      {row.status === LICENSE_STATUSES.DISABLED ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleEnable(row.id)}
                        >
                          Enable
                        </Button>
                      ) : null}
                      {row.status !== LICENSE_STATUSES.REVOKED &&
                      row.status !== LICENSE_STATUSES.EXPIRED ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleRevoke(row.id)}
                        >
                          Revoke
                        </Button>
                      ) : null}
                      {row.status !== LICENSE_STATUSES.ACTIVATED ? (
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
            <DialogTitle>Generate Licenses</DialogTitle>
            <DialogDescription>
              Create STM-XXXX-XXXX-XXXX license codes for Lifetime, Trial, or Subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <select
                id="quantity"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) as QuantityOption)}
              >
                {LICENSE_GENERATE_QUANTITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseType">License Type</Label>
              <select
                id="licenseType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={licenseType}
                onChange={(event) => setLicenseType(event.target.value as LicenseTypeOption)}
              >
                <option value={LICENSE_TYPES.LIFETIME}>Lifetime</option>
                <option value={LICENSE_TYPES.TRIAL}>Trial (30 days)</option>
                <option value={LICENSE_TYPES.SUBSCRIPTION}>Subscription</option>
              </select>
            </div>
            {licenseType === LICENSE_TYPES.SUBSCRIPTION ? (
              <div className="space-y-2">
                <Label htmlFor="subscriptionMonths">Subscription Months</Label>
                <select
                  id="subscriptionMonths"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={subscriptionMonths}
                  onChange={(event) =>
                    setSubscriptionMonths(Number(event.target.value) as MonthsOption)
                  }
                >
                  {LICENSE_SUBSCRIPTION_MONTHS.map((value) => (
                    <option key={value} value={value}>
                      {value} month{value === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name (optional)</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
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
            <DialogTitle>Delete license</DialogTitle>
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
            <DialogTitle>License details</DialogTitle>
            <DialogDescription>Read-only license information.</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Code:</span> {detail.code}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span> {detail.status}
              </p>
              <p>
                <span className="text-muted-foreground">Type:</span> {detail.licenseType}
                {detail.subscriptionMonths ? ` (${detail.subscriptionMonths} months)` : ""}
              </p>
              <p>
                <span className="text-muted-foreground">Customer:</span>{" "}
                {detail.customerName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span> {detail.phone ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Studio:</span>{" "}
                {detail.usedByStudioName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Owner Email:</span>{" "}
                {detail.usedByOwnerEmail ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Activated:</span>{" "}
                {detail.activatedAt ? new Date(detail.activatedAt).toLocaleString() : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Expires:</span>{" "}
                {detail.expiresAt ? new Date(detail.expiresAt).toLocaleString() : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Revoked:</span>{" "}
                {detail.revokedAt ? new Date(detail.revokedAt).toLocaleString() : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Notes:</span> {detail.notes ?? "—"}
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
