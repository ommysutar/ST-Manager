"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@st-manager/ui";
import Link from "next/link";
import { useMemo, useState } from "react";

import { RequireModule } from "@/components/roles/AccessDenied";
import { usePermissions } from "@/hooks/usePermissions";
import { useProjects } from "@/hooks/useProjects";
import { useStudios } from "@/hooks/useStudios";
import { layout } from "@st-manager/theme";
import { formatINR } from "@/lib/currency";
import {
  buildBookingReports,
  buildClientReports,
  buildExpenseReport,
  buildPaymentReports,
  buildProfitReport,
  buildProjectReports,
  buildRevenueReport,
} from "@/lib/reports/aggregators";
import { getDefaultReportFilters, resolveDateRange } from "@/lib/reports/filters";
import type { ReportFilters, ReportPeriodType } from "@/lib/reports/types";

type ReportSection =
  | "projects"
  | "revenue"
  | "payments"
  | "expenses"
  | "profit"
  | "clients"
  | "bookings";

const SECTIONS: { id: ReportSection; label: string }[] = [
  { id: "projects", label: "Project Reports" },
  { id: "revenue", label: "Revenue Reports" },
  { id: "payments", label: "Payment Reports" },
  { id: "expenses", label: "Expense Reports" },
  { id: "profit", label: "Profit Reports" },
  { id: "clients", label: "Client Reports" },
  { id: "bookings", label: "Booking Reports" },
];

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPageClient() {
  const projects = useProjects();
  const studios = useStudios();
  const { filterProjects, canViewProfit, canEditReports } = usePermissions();
  const [section, setSection] = useState<ReportSection>("projects");
  const [filters, setFilters] = useState<ReportFilters>(() => getDefaultReportFilters());

  const scopedProjects = useMemo(() => filterProjects(projects), [filterProjects, projects]);
  const range = useMemo(() => resolveDateRange(filters), [filters]);

  const projectReports = useMemo(
    () => buildProjectReports(scopedProjects, filters),
    [scopedProjects, filters],
  );
  const revenueReport = useMemo(
    () => buildRevenueReport(scopedProjects, filters),
    [scopedProjects, filters],
  );
  const paymentReports = useMemo(
    () => buildPaymentReports(scopedProjects, filters),
    [scopedProjects, filters],
  );
  const expenseReport = useMemo(
    () => buildExpenseReport(scopedProjects, filters),
    [scopedProjects, filters],
  );
  const profitReport = useMemo(
    () => buildProfitReport(scopedProjects, filters),
    [scopedProjects, filters],
  );
  const clientReports = useMemo(
    () => buildClientReports(scopedProjects, filters),
    [scopedProjects, filters],
  );
  const bookingReports = useMemo(
    () => buildBookingReports(scopedProjects, filters),
    [scopedProjects, filters],
  );

  function updatePeriodType(periodType: ReportPeriodType) {
    const now = new Date();
    setFilters((current) => ({
      ...current,
      periodType,
      date: periodType === "date" ? now.toISOString().slice(0, 10) : current.date,
      month: current.month ?? now.getMonth() + 1,
      year: current.year ?? now.getFullYear(),
    }));
  }

  function handleExport() {
    if (!canEditReports()) return;

    if (section === "projects") {
      exportCsv(
        "project-reports.csv",
        ["Project", "Client", "Value", "Received", "Pending", "Expenses", "Profit", "Engineer"],
        projectReports.map((row) => [
          row.projectName,
          row.clientName,
          String(row.projectValue),
          String(row.paymentsReceived),
          String(row.pendingPayments),
          String(row.projectExpenses),
          String(row.netProfit),
          row.assignedEngineer,
        ]),
      );
    } else if (section === "payments") {
      exportCsv(
        "payment-reports.csv",
        ["Project", "Client", "Amount", "Method", "Date"],
        paymentReports.map((row) => [
          row.projectName,
          row.clientName,
          String(row.amount),
          row.method,
          row.date,
        ]),
      );
    }
  }

  return (
    <RequireModule module="reports">
      <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Studio-native analytics from projects, payments, expenses, and bookings (INR).
            </p>
          </div>
          {canEditReports() ? (
            <Button type="button" variant="outline" onClick={handleExport}>
              Export CSV
            </Button>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              Period: {range.from} — {range.to}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Period</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filters.periodType}
                onChange={(event) => updatePeriodType(event.target.value as ReportPeriodType)}
                disabled={!canEditReports()}
              >
                <option value="date">Date</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="range">Custom range</option>
              </select>
            </div>

            {filters.periodType === "date" ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <input
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={filters.date ?? ""}
                  onChange={(event) => setFilters((c) => ({ ...c, date: event.target.value }))}
                  disabled={!canEditReports()}
                />
              </div>
            ) : null}

            {filters.periodType === "month" ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Month</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={filters.month ?? 1}
                    onChange={(event) =>
                      setFilters((c) => ({ ...c, month: Number(event.target.value) }))
                    }
                    disabled={!canEditReports()}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleDateString(undefined, { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Year</label>
                  <input
                    type="number"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={filters.year ?? new Date().getFullYear()}
                    onChange={(event) =>
                      setFilters((c) => ({ ...c, year: Number(event.target.value) }))
                    }
                    disabled={!canEditReports()}
                  />
                </div>
              </>
            ) : null}

            {filters.periodType === "year" ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Year</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={filters.year ?? new Date().getFullYear()}
                  onChange={(event) =>
                    setFilters((c) => ({ ...c, year: Number(event.target.value) }))
                  }
                  disabled={!canEditReports()}
                />
              </div>
            ) : null}

            {filters.periodType === "range" ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <input
                    type="date"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={filters.dateFrom ?? ""}
                    onChange={(event) =>
                      setFilters((c) => ({ ...c, dateFrom: event.target.value }))
                    }
                    disabled={!canEditReports()}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">To</label>
                  <input
                    type="date"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={filters.dateTo ?? ""}
                    onChange={(event) => setFilters((c) => ({ ...c, dateTo: event.target.value }))}
                    disabled={!canEditReports()}
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Client</label>
              <input
                type="text"
                placeholder="Filter by client"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filters.clientName ?? ""}
                onChange={(event) =>
                  setFilters((c) => ({ ...c, clientName: event.target.value || undefined }))
                }
                disabled={!canEditReports()}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Project</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filters.projectId ?? ""}
                onChange={(event) =>
                  setFilters((c) => ({
                    ...c,
                    projectId: event.target.value || undefined,
                  }))
                }
                disabled={!canEditReports()}
              >
                <option value="">All projects</option>
                {scopedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectNumber} · {project.projectName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Studio</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filters.studioId ?? ""}
                onChange={(event) =>
                  setFilters((c) => ({
                    ...c,
                    studioId: event.target.value || undefined,
                  }))
                }
                disabled={!canEditReports()}
              >
                <option value="">All studios</option>
                {studios.map((studio) => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((entry) => {
            if (entry.id === "profit" && !canViewProfit()) {
              return null;
            }
            return (
              <Button
                key={entry.id}
                type="button"
                size="sm"
                variant={section === entry.id ? "default" : "outline"}
                onClick={() => setSection(entry.id)}
              >
                {entry.label}
              </Button>
            );
          })}
        </div>

        {section === "projects" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Reports</CardTitle>
              <CardDescription>Financial and delivery summary per project.</CardDescription>
            </CardHeader>
            <CardContent>
              {projectReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects match these filters.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Pending</TableHead>
                      {canViewProfit() ? <TableHead>Expenses</TableHead> : null}
                      {canViewProfit() ? <TableHead>Net Profit</TableHead> : null}
                      <TableHead>Engineer</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectReports.map((row) => (
                      <TableRow key={row.projectId}>
                        <TableCell>
                          <Link
                            href={`/reports/projects/${row.projectId}`}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {row.projectNumber} · {row.projectName}
                          </Link>
                        </TableCell>
                        <TableCell>{row.clientName}</TableCell>
                        <TableCell>{formatINR(row.projectValue)}</TableCell>
                        <TableCell>{formatINR(row.paymentsReceived)}</TableCell>
                        <TableCell>{formatINR(row.pendingPayments)}</TableCell>
                        {canViewProfit() ? (
                          <TableCell>{formatINR(row.projectExpenses)}</TableCell>
                        ) : null}
                        {canViewProfit() ? (
                          <TableCell>{formatINR(row.netProfit)}</TableCell>
                        ) : null}
                        <TableCell>{row.assignedEngineer}</TableCell>
                        <TableCell>{row.bookingCount}</TableCell>
                        <TableCell>{row.filesShared ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          {row.completionDate
                            ? new Date(`${row.completionDate}T12:00:00`).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}

        {section === "revenue" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Collected payments</p>
                  <p className="text-2xl font-semibold">{formatINR(revenueReport.collectedPayments)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending payments</p>
                  <p className="text-2xl font-semibold">{formatINR(revenueReport.pendingPayments)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average project value</p>
                  <p className="text-2xl font-semibold">{formatINR(revenueReport.averageProjectValue)}</p>
                </div>
              </div>
              {revenueReport.monthlyRevenue.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium">Monthly revenue</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueReport.monthlyRevenue.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell>{row.label}</TableCell>
                          <TableCell>{formatINR(row.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
              {revenueReport.yearlyRevenue.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium">Yearly revenue</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueReport.yearlyRevenue.map((row) => (
                        <TableRow key={row.year}>
                          <TableCell>{row.year}</TableCell>
                          <TableCell>{formatINR(row.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {section === "payments" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments in this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentReports.map((row) => (
                      <TableRow key={row.paymentId}>
                        <TableCell>{row.projectName}</TableCell>
                        <TableCell>{row.clientName}</TableCell>
                        <TableCell>{formatINR(row.amount)}</TableCell>
                        <TableCell>{row.method}</TableCell>
                        <TableCell>{row.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}

        {section === "expenses" && canViewProfit() ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expense Report</CardTitle>
              <CardDescription>Total: {formatINR(expenseReport.totalExpense)}</CardDescription>
            </CardHeader>
            <CardContent>
              {expenseReport.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses in this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseReport.rows.map((row) => (
                      <TableRow key={row.expenseId}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.projectName}</TableCell>
                        <TableCell>{formatINR(row.amount)}</TableCell>
                        <TableCell>{row.expenseDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}

        {section === "profit" && canViewProfit() ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profit Report</CardTitle>
              <CardDescription>Revenue − Expenses = Net Profit (owner only)</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-semibold">{formatINR(profitReport.revenue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-2xl font-semibold">{formatINR(profitReport.expenses)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net profit</p>
                <p className="text-2xl font-semibold">{formatINR(profitReport.netProfit)}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {section === "clients" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {clientReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No client data for these filters.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Bookings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientReports.map((row) => (
                      <TableRow key={row.clientName}>
                        <TableCell className="font-medium">{row.clientName}</TableCell>
                        <TableCell>{row.projectCount}</TableCell>
                        <TableCell>{formatINR(row.totalRevenue)}</TableCell>
                        <TableCell>{formatINR(row.totalReceived)}</TableCell>
                        <TableCell>{row.bookingCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}

        {section === "bookings" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {bookingReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings in this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Studio</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Booking For</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingReports.map((row) => (
                      <TableRow key={row.bookingId}>
                        <TableCell>{row.projectName}</TableCell>
                        <TableCell>{row.clientName}</TableCell>
                        <TableCell>{row.studioName}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.slotLabel}</TableCell>
                        <TableCell>{row.bookingFor}</TableCell>
                        <TableCell>{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </RequireModule>
  );
}
