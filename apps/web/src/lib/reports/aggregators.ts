import { listBookings } from "@/lib/bookings/storage";
import { getBookingSlotLabel } from "@/lib/bookings/slots";
import { listPayments } from "@/lib/payments/storage";
import { calculateProjectProfit } from "@/lib/projects/profit";
import { getPrimaryEngineer } from "@/lib/projects/progress";
import { getTotalExpenses } from "@/lib/projects/expenses";
import type { StudioProject } from "@/lib/projects/types";
import { getStudio } from "@/lib/studios/storage";

import { isDateInRange, isTimestampInRange, resolveDateRange } from "./filters";
import type {
  BookingReportRow,
  ClientReportRow,
  ExpenseReportSummary,
  PaymentReportRow,
  ProfitReportSummary,
  ProjectReportRow,
  ReportFilters,
  RevenueReportSummary,
} from "./types";

function matchesProjectFilters(
  project: StudioProject,
  filters: ReportFilters,
): boolean {
  if (filters.projectId && project.id !== filters.projectId) {
    return false;
  }
  if (filters.clientName && !project.clientName.toLowerCase().includes(filters.clientName.toLowerCase())) {
    return false;
  }
  return true;
}

function projectCompletionDate(project: StudioProject): string | undefined {
  if (project.status !== "completed" && project.status !== "delivered") {
    return undefined;
  }
  const deliveryTask = project.tasks.find(
    (task) => task.mandatoryKey === "project_delivery" && task.completed,
  );
  return deliveryTask?.completedDate ?? undefined;
}

function filesSharedComplete(project: StudioProject): boolean {
  return project.tasks.some(
    (task) => task.mandatoryKey === "files_shared" && task.completed,
  );
}

export function buildProjectReports(
  projects: StudioProject[],
  filters: ReportFilters,
): ProjectReportRow[] {
  const { from, to } = resolveDateRange(filters);

  return projects
    .filter((project) => matchesProjectFilters(project, filters))
    .map((project) => {
      const profit = calculateProjectProfit(project);
      const bookingCount = listBookings().filter(
        (b) =>
          b.projectId === project.id &&
          b.status !== "cancelled" &&
          isDateInRange(b.date, from, to) &&
          (!filters.studioId || b.studioId === filters.studioId),
      ).length;

      return {
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        clientName: project.clientName,
        projectValue: project.grandTotal,
        paymentsReceived: project.advanceReceived,
        pendingPayments: project.remainingBalance,
        projectExpenses: profit.totalExpenses,
        netProfit: profit.netProfit,
        assignedEngineer: getPrimaryEngineer(project),
        bookingCount,
        filesShared: filesSharedComplete(project),
        completionDate: projectCompletionDate(project),
        createdAt: project.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function buildProjectReport(
  project: StudioProject,
  filters: ReportFilters,
): ProjectReportRow {
  const rows = buildProjectReports([project], { ...filters, projectId: project.id });
  const profit = calculateProjectProfit(project);
  const { from, to } = resolveDateRange(filters);
  const bookingCount = listBookings().filter(
    (b) =>
      b.projectId === project.id &&
      b.status !== "cancelled" &&
      isDateInRange(b.date, from, to),
  ).length;

  return (
    rows[0] ?? {
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      clientName: project.clientName,
      projectValue: project.grandTotal,
      paymentsReceived: project.advanceReceived,
      pendingPayments: project.remainingBalance,
      projectExpenses: profit.totalExpenses,
      netProfit: profit.netProfit,
      assignedEngineer: getPrimaryEngineer(project),
      bookingCount,
      filesShared: filesSharedComplete(project),
      completionDate: projectCompletionDate(project),
      createdAt: project.createdAt,
    }
  );
}

export function buildRevenueReport(
  projects: StudioProject[],
  filters: ReportFilters,
): RevenueReportSummary {
  const { from, to } = resolveDateRange(filters);
  const scoped = projects.filter((p) => matchesProjectFilters(p, filters));

  const paymentsInRange = listPayments().filter((payment) => {
    const project = scoped.find((p) => p.id === payment.projectId);
    return project && isTimestampInRange(payment.createdAt, from, to);
  });

  const collectedPayments = paymentsInRange.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = scoped.reduce((sum, p) => sum + p.remainingBalance, 0);
  const averageProjectValue =
    scoped.length === 0
      ? 0
      : Math.round(scoped.reduce((sum, p) => sum + p.grandTotal, 0) / scoped.length);

  const monthlyMap = new Map<string, number>();
  for (const payment of paymentsInRange) {
    const key = payment.createdAt.slice(0, 7);
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + payment.amount);
  }

  const monthlyRevenue = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => {
      const [year, month] = key.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      });
      return { key, label, amount };
    });

  const yearlyMap = new Map<number, number>();
  for (const payment of paymentsInRange) {
    const year = Number(payment.createdAt.slice(0, 4));
    yearlyMap.set(year, (yearlyMap.get(year) ?? 0) + payment.amount);
  }

  const yearlyRevenue = [...yearlyMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, amount]) => ({ year, amount }));

  return {
    monthlyRevenue,
    yearlyRevenue,
    collectedPayments,
    pendingPayments,
    averageProjectValue,
  };
}

export function buildExpenseReport(
  projects: StudioProject[],
  filters: ReportFilters,
): ExpenseReportSummary {
  const { from, to } = resolveDateRange(filters);
  const rows = projects
    .filter((project) => matchesProjectFilters(project, filters))
    .flatMap((project) =>
      project.expenses
        .filter((expense) => isDateInRange(expense.expenseDate, from, to))
        .map((expense) => ({
          expenseId: expense.id,
          category: expense.category,
          projectId: project.id,
          projectName: project.projectName,
          amount: expense.amount,
          expenseDate: expense.expenseDate,
        })),
    );

  return {
    rows: rows.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)),
    totalExpense: rows.reduce((sum, row) => sum + row.amount, 0),
  };
}

export function buildProfitReport(
  projects: StudioProject[],
  filters: ReportFilters,
): ProfitReportSummary {
  const scoped = projects.filter((p) => matchesProjectFilters(p, filters));
  const revenue = scoped.reduce((sum, p) => sum + p.grandTotal, 0);
  const expenses = scoped.reduce((sum, p) => sum + getTotalExpenses(p), 0);

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
  };
}

export function buildClientReports(
  projects: StudioProject[],
  filters: ReportFilters,
): ClientReportRow[] {
  const { from, to } = resolveDateRange(filters);
  const map = new Map<string, ClientReportRow>();

  for (const project of projects.filter((p) => matchesProjectFilters(p, filters))) {
    const key = project.clientName.trim() || "Unknown";
    const existing = map.get(key) ?? {
      clientName: key,
      projectCount: 0,
      totalRevenue: 0,
      totalReceived: 0,
      bookingCount: 0,
    };

    existing.projectCount += 1;
    existing.totalRevenue += project.grandTotal;
    existing.totalReceived += project.advanceReceived;
    existing.bookingCount += listBookings().filter(
      (b) =>
        b.projectId === project.id &&
        b.status !== "cancelled" &&
        isDateInRange(b.date, from, to),
    ).length;

    map.set(key, existing);
  }

  return [...map.values()].sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export function buildBookingReports(
  projects: StudioProject[],
  filters: ReportFilters,
): BookingReportRow[] {
  const { from, to } = resolveDateRange(filters);
  const projectIds = new Set(projects.map((p) => p.id));

  return listBookings()
    .filter((booking) => {
      if (booking.status === "cancelled") return false;
      if (!projectIds.has(booking.projectId)) return false;
      if (!isDateInRange(booking.date, from, to)) return false;
      if (filters.studioId && booking.studioId !== filters.studioId) return false;
      if (filters.projectId && booking.projectId !== filters.projectId) return false;
      if (
        filters.clientName &&
        !booking.clientName.toLowerCase().includes(filters.clientName.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .map((booking) => ({
      bookingId: booking.id,
      projectName: booking.projectName,
      clientName: booking.clientName,
      studioName: getStudio(booking.studioId)?.name ?? "—",
      date: booking.date,
      slotLabel: getBookingSlotLabel(booking.slotId),
      bookingFor: booking.bookingFor,
      status: booking.status,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function buildPaymentReports(
  projects: StudioProject[],
  filters: ReportFilters,
): PaymentReportRow[] {
  const { from, to } = resolveDateRange(filters);
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return listPayments()
    .filter((payment) => {
      const project = projectMap.get(payment.projectId);
      if (!project) return false;
      if (!matchesProjectFilters(project, filters)) return false;
      return isTimestampInRange(payment.createdAt, from, to);
    })
    .map((payment) => {
      const project = projectMap.get(payment.projectId)!;
      return {
        paymentId: payment.id,
        projectName: project.projectName,
        clientName: project.clientName,
        amount: payment.amount,
        method: payment.method.toUpperCase(),
        date: payment.createdAt.slice(0, 10),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
