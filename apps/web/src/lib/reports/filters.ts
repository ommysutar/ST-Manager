import type { ReportFilters } from "./types";

export function getDefaultReportFilters(): ReportFilters {
  const now = new Date();
  return {
    periodType: "month",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function resolveDateRange(filters: ReportFilters): { from: string; to: string } {
  if (filters.periodType === "date" && filters.date) {
    return { from: filters.date, to: filters.date };
  }

  if (filters.periodType === "month" && filters.month && filters.year) {
    const from = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const to = `${filters.year}-${String(filters.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { from, to };
  }

  if (filters.periodType === "year" && filters.year) {
    return { from: `${filters.year}-01-01`, to: `${filters.year}-12-31` };
  }

  if (filters.periodType === "range" && filters.dateFrom && filters.dateTo) {
    return { from: filters.dateFrom, to: filters.dateTo };
  }

  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export function isDateInRange(isoDate: string, from: string, to: string): boolean {
  return isoDate >= from && isoDate <= to;
}

export function isTimestampInRange(isoTimestamp: string, from: string, to: string): boolean {
  const day = isoTimestamp.slice(0, 10);
  return isDateInRange(day, from, to);
}
