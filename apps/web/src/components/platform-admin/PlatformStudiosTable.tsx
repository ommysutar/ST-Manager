"use client";

import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@st-manager/ui";
import { STUDIO_STATUSES } from "@st-manager/constants";
import type { PlatformStudioListItemDto } from "@st-manager/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MobileDataCard, MobileDataField, ResponsiveDataView } from "@/components/ui/ResponsiveDataView";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformAdminApi } from "@/lib/platform-api-client";

function statusVariant(status: string) {
  if (status === STUDIO_STATUSES.ACTIVE) return "success" as const;
  if (status === STUDIO_STATUSES.DISABLED) return "outline" as const;
  return "secondary" as const;
}

export function PlatformStudiosTable() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "status" | "totalUsers">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<PlatformStudioListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await platformAdminApi.listStudios({
        search: debouncedSearch || undefined,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });
      setRows(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load studios"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, sortBy, sortOrder]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function toggleSort(column: typeof sortBy) {
    setPage(1);
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder(column === "name" ? "asc" : "desc");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="max-w-md"
          placeholder="Search studio, owner name, or email…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          {total} studio{total === 1 ? "" : "s"}
        </p>
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
                <MobileDataField label="Users" value={String(studio.totalUsers)} />
                <MobileDataField
                  label="Created"
                  value={new Date(studio.createdAt).toLocaleDateString()}
                />
                <MobileDataField
                  label="Status"
                  value={<Badge variant={statusVariant(studio.status)}>{studio.status}</Badge>}
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
                    <button type="button" className="font-medium" onClick={() => toggleSort("name")}>
                      Studio Name
                    </button>
                  </TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Owner Email</TableHead>
                  <TableHead>
                    <button type="button" className="font-medium" onClick={() => toggleSort("createdAt")}>
                      Created Date
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="font-medium" onClick={() => toggleSort("totalUsers")}>
                      Total Users
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="font-medium" onClick={() => toggleSort("status")}>
                      Status
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No studios found
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.map((studio) => (
                  <TableRow key={studio.id}>
                    <TableCell className="font-medium">{studio.name}</TableCell>
                    <TableCell>{studio.ownerName ?? "—"}</TableCell>
                    <TableCell>{studio.ownerEmail ?? "—"}</TableCell>
                    <TableCell>{new Date(studio.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{studio.totalUsers}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(studio.status)}>{studio.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/platform-admin/studios/${studio.id}`}>Manage</Link>
                      </Button>
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
    </div>
  );
}
