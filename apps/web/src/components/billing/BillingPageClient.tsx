"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { InvoiceResponseDto, ListInvoicesResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { invoicesApi } from "@/lib/api-client";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatStatus(status: InvoiceResponseDto["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function BillingPageClient() {
  const { isAuthenticated } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceResponseDto[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [loadedFilterKey, setLoadedFilterKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );

  const canFetch = isAuthenticated && isOnline;
  const filterKey = status;
  const isLoading = canFetch && loadedFilterKey !== filterKey;

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

    invoicesApi
      .listInvoices({
        status:
          status === "all" ? undefined : (status as InvoiceResponseDto["status"]),
        page: 1,
        pageSize: 50,
      })
      .then((response: ListInvoicesResponseDto) => {
        if (!cancelled) {
          setInvoices(response.data);
          setLoadedFilterKey(filterKey);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : "Failed to load invoices";
          setError(message);
          setLoadedFilterKey(filterKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, filterKey, status]);

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Create invoices, track sent and paid status, and print client bills.
          </p>
        </div>
        {canFetch ? (
          <Button asChild>
            <Link href="/billing/new">New invoice</Link>
          </Button>
        ) : null}
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sign in to view and manage invoices.</p>
          </CardContent>
        </Card>
      ) : !isOnline ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Billing requires an internet connection to load from the API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="max-w-xs flex flex-col gap-2">
            <label htmlFor="invoice-filter-status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="invoice-filter-status"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading invoices...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  No invoices yet.{" "}
                  <Link href="/billing/new" className="text-primary underline-offset-4 hover:underline">
                    Create an invoice
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      <Link href={`/billing/${invoice.id}`} className="hover:underline">
                        Invoice #{invoice.number}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {invoice.clientName} · {formatStatus(invoice.status)} ·{" "}
                      {formatCurrency(invoice.total)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Due {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
