"use client";

import { ApiError } from "@st-manager/api-sdk";
import type {
  ClientActivityReportDataDto,
  RevenueReportDataDto,
  UtilizationReportDataDto,
} from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { reportsApi } from "@/lib/api-client";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatPercent(value: number): string {
  return `${value}%`;
}

function getDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function dateInputToIsoStart(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function dateInputToIsoEnd(value: string): string {
  const end = new Date(`${value}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
}

function RevenueBarChart({ breakdown }: { breakdown: RevenueReportDataDto["dailyBreakdown"] }) {
  const maxRevenue = useMemo(
    () => Math.max(...breakdown.map((row) => row.revenue), 1),
    [breakdown],
  );

  if (breakdown.length === 0) {
    return <p className="text-sm text-muted-foreground">No paid invoices in this range.</p>;
  }

  return (
    <div className="flex h-40 items-end gap-2">
      {breakdown.map((row) => (
        <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-md bg-primary/80"
            style={{ height: `${Math.max((row.revenue / maxRevenue) * 100, row.revenue > 0 ? 8 : 0)}%` }}
            title={`${row.date}: ${formatCurrency(row.revenue)}`}
          />
          <span className="truncate text-[10px] text-muted-foreground">{row.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportsPageClient() {
  const { isAuthenticated } = useAuth();
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [fromInput, setFromInput] = useState(toDateInputValue(defaultRange.from));
  const [toInput, setToInput] = useState(
    toDateInputValue(new Date(new Date(defaultRange.to).getTime() - 86_400_000).toISOString()),
  );
  const [loadedRangeKey, setLoadedRangeKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReportDataDto | null>(null);
  const [utilizationReport, setUtilizationReport] = useState<UtilizationReportDataDto | null>(null);
  const [clientReport, setClientReport] = useState<ClientActivityReportDataDto | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );

  const range = useMemo(
    () => ({
      from: dateInputToIsoStart(fromInput),
      to: dateInputToIsoEnd(toInput),
    }),
    [fromInput, toInput],
  );
  const rangeKey = `${range.from}|${range.to}`;
  const canFetch = isAuthenticated && isOnline;
  const isLoading = canFetch && loadedRangeKey !== rangeKey;

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

    Promise.all([
      reportsApi.getRevenueReport(range),
      reportsApi.getUtilizationReport(range),
      reportsApi.getClientActivityReport(range),
    ])
      .then(([revenue, utilization, clients]) => {
        if (!cancelled) {
          setRevenueReport(revenue);
          setUtilizationReport(utilization);
          setClientReport(clients);
          setLoadedRangeKey(rangeKey);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : "Failed to load reports";
          setError(message);
          setLoadedRangeKey(rangeKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, range, rangeKey]);

  async function handleDownloadCsv() {
    try {
      const csv = await reportsApi.getRevenueCsv(range);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "revenue-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to download CSV";
      setError(message);
    }
  }

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Review revenue, studio utilization, and client activity for a selected date range.
          </p>
        </div>
        {canFetch && revenueReport ? (
          <Button type="button" variant="outline" onClick={handleDownloadCsv}>
            Export revenue CSV
          </Button>
        ) : null}
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sign in to view reports.</p>
          </CardContent>
        </Card>
      ) : !isOnline ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Reports require an internet connection.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Date range</CardTitle>
              <CardDescription>Select the period to analyze.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">From</span>
                <input
                  type="date"
                  value={fromInput}
                  onChange={(event) => setFromInput(event.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">To</span>
                <input
                  type="date"
                  value={toInput}
                  onChange={(event) => setToInput(event.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2"
                />
              </label>
            </CardContent>
          </Card>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Loading reports…</p> : null}

          {revenueReport ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue</CardTitle>
                <CardDescription>
                  Paid invoices between {fromInput} and {toInput}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total revenue</p>
                    <p className="text-2xl font-semibold">
                      {formatCurrency(revenueReport.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid invoices</p>
                    <p className="text-2xl font-semibold">{revenueReport.invoiceCount}</p>
                  </div>
                </div>
                <RevenueBarChart breakdown={revenueReport.dailyBreakdown} />
                {revenueReport.dailyBreakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Revenue</th>
                          <th className="py-2">Invoices</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueReport.dailyBreakdown.map((row) => (
                          <tr key={row.date} className="border-b">
                            <td className="py-2 pr-4">{row.date}</td>
                            <td className="py-2 pr-4">{formatCurrency(row.revenue)}</td>
                            <td className="py-2">{row.invoiceCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {utilizationReport ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Utilization</CardTitle>
                <CardDescription>
                  Completed session time compared with studio availability.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Overall utilization</p>
                  <p className="text-2xl font-semibold">
                    {formatPercent(utilizationReport.overallPercent)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {utilizationReport.totalUsedMinutes} of {utilizationReport.totalAvailableMinutes}{" "}
                    studio minutes used
                  </p>
                </div>
                {utilizationReport.byStudio.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">Studio</th>
                          <th className="py-2 pr-4">Used</th>
                          <th className="py-2 pr-4">Available</th>
                          <th className="py-2">Utilization</th>
                        </tr>
                      </thead>
                      <tbody>
                        {utilizationReport.byStudio.map((row) => (
                          <tr key={row.studioId} className="border-b">
                            <td className="py-2 pr-4">{row.studioName}</td>
                            <td className="py-2 pr-4">{row.usedMinutes} min</td>
                            <td className="py-2 pr-4">{row.availableMinutes} min</td>
                            <td className="py-2">{formatPercent(row.utilizationPercent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No studios found.</p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {clientReport ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client activity</CardTitle>
                <CardDescription>
                  Bookings, sessions, and paid revenue by client in this range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientReport.clients.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">Client</th>
                          <th className="py-2 pr-4">Bookings</th>
                          <th className="py-2 pr-4">Sessions</th>
                          <th className="py-2">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientReport.clients.map((row) => (
                          <tr key={row.clientId} className="border-b">
                            <td className="py-2 pr-4">{row.clientName}</td>
                            <td className="py-2 pr-4">{row.bookingCount}</td>
                            <td className="py-2 pr-4">{row.sessionCount}</td>
                            <td className="py-2">{formatCurrency(row.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No client activity recorded in this range.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
