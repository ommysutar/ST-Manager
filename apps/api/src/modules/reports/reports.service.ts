import { Injectable } from "@nestjs/common";
import type {
  ClientActivityReportDataDto,
  DashboardRevenueTrendPointDto,
  RevenueReportDataDto,
  UtilizationReportDataDto,
} from "@st-manager/contracts";
import type { ReportsDateRangeQueryInput } from "@st-manager/validation";

import type { CompletedSessionRecord, StudioRecord } from "./reports.repository";
import { ReportsRepository } from "./reports.repository";

const MS_PER_MINUTE = 60_000;

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function toIso(value: Date): string {
  return value.toISOString();
}

function getUtcDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getRangeMinutes(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_MINUTE);
}

function getSessionMinutes(session: CompletedSessionRecord): number {
  return Math.max(0, (session.endedAt.getTime() - session.startedAt.getTime()) / MS_PER_MINUTE);
}

export function computeUtilization(
  studios: StudioRecord[],
  sessions: CompletedSessionRecord[],
  from: Date,
  to: Date,
): Pick<
  UtilizationReportDataDto,
  "overallPercent" | "totalUsedMinutes" | "totalAvailableMinutes" | "byStudio"
> {
  const availableMinutesPerStudio = getRangeMinutes(from, to);
  const usedByStudio = new Map<string, number>();

  for (const session of sessions) {
    const usedMinutes = getSessionMinutes(session);
    usedByStudio.set(session.studioId, (usedByStudio.get(session.studioId) ?? 0) + usedMinutes);
  }

  const byStudio = studios.map((studio) => {
    const usedMinutes = usedByStudio.get(studio.id) ?? 0;
    const utilizationPercent =
      availableMinutesPerStudio > 0
        ? roundPercent((usedMinutes / availableMinutesPerStudio) * 100)
        : 0;

    return {
      studioId: studio.id,
      studioName: studio.name,
      usedMinutes: Math.round(usedMinutes),
      availableMinutes: Math.round(availableMinutesPerStudio),
      utilizationPercent,
    };
  });

  const totalUsedMinutes = byStudio.reduce((sum, row) => sum + row.usedMinutes, 0);
  const totalAvailableMinutes = byStudio.reduce((sum, row) => sum + row.availableMinutes, 0);
  const overallPercent =
    totalAvailableMinutes > 0
      ? roundPercent((totalUsedMinutes / totalAvailableMinutes) * 100)
      : 0;

  return {
    overallPercent,
    totalUsedMinutes,
    totalAvailableMinutes,
    byStudio,
  };
}

export function buildRevenueTrend(
  invoices: { paidAt: Date; total: number }[],
  from: Date,
  to: Date,
): DashboardRevenueTrendPointDto[] {
  const totalsByDate = new Map<string, number>();

  for (const invoice of invoices) {
    const key = getUtcDateKey(invoice.paidAt);
    totalsByDate.set(key, (totalsByDate.get(key) ?? 0) + invoice.total);
  }

  const trend: DashboardRevenueTrendPointDto[] = [];
  const cursor = new Date(from);

  while (cursor < to) {
    const key = getUtcDateKey(cursor);
    trend.push({
      date: key,
      revenue: totalsByDate.get(key) ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return trend;
}

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  private parseRange(query: ReportsDateRangeQueryInput): { from: Date; to: Date } {
    return {
      from: new Date(query.from),
      to: new Date(query.to),
    };
  }

  async getRevenueReport(query: ReportsDateRangeQueryInput): Promise<RevenueReportDataDto> {
    const { from, to } = this.parseRange(query);
    const invoices = await this.reportsRepository.findPaidInvoicesInRange(from, to);
    const dailyTotals = new Map<string, { revenue: number; invoiceCount: number }>();

    for (const invoice of invoices) {
      const key = getUtcDateKey(invoice.paidAt);
      const current = dailyTotals.get(key) ?? { revenue: 0, invoiceCount: 0 };
      dailyTotals.set(key, {
        revenue: current.revenue + invoice.total,
        invoiceCount: current.invoiceCount + 1,
      });
    }

    const dailyBreakdown = [...dailyTotals.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, totals]) => ({
        date,
        revenue: totals.revenue,
        invoiceCount: totals.invoiceCount,
      }));

    return {
      from: toIso(from),
      to: toIso(to),
      totalRevenue: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
      invoiceCount: invoices.length,
      dailyBreakdown,
    };
  }

  async getUtilizationReport(query: ReportsDateRangeQueryInput): Promise<UtilizationReportDataDto> {
    const { from, to } = this.parseRange(query);
    const [studios, sessions] = await Promise.all([
      this.reportsRepository.findStudios(),
      this.reportsRepository.findCompletedSessionsInRange(from, to),
    ]);

    return {
      from: toIso(from),
      to: toIso(to),
      ...computeUtilization(studios, sessions, from, to),
    };
  }

  async getClientActivityReport(
    query: ReportsDateRangeQueryInput,
  ): Promise<ClientActivityReportDataDto> {
    const { from, to } = this.parseRange(query);
    const [clients, bookings, sessions, invoices] = await Promise.all([
      this.reportsRepository.findActiveClients(),
      this.reportsRepository.findBookingsInRange(from, to),
      this.reportsRepository.findSessionsInRange(from, to),
      this.reportsRepository.findPaidInvoicesInRange(from, to),
    ]);

    const bookingCounts = new Map<string, number>();
    for (const booking of bookings) {
      if (!booking.clientId) {
        continue;
      }
      bookingCounts.set(booking.clientId, (bookingCounts.get(booking.clientId) ?? 0) + 1);
    }

    const sessionCounts = new Map<string, number>();
    for (const session of sessions) {
      if (!session.clientId) {
        continue;
      }
      sessionCounts.set(session.clientId, (sessionCounts.get(session.clientId) ?? 0) + 1);
    }

    const revenueTotals = new Map<string, number>();
    for (const invoice of invoices) {
      revenueTotals.set(invoice.clientId, (revenueTotals.get(invoice.clientId) ?? 0) + invoice.total);
    }

    const clientsWithActivity = clients
      .map((client) => ({
        clientId: client.id,
        clientName: client.name,
        bookingCount: bookingCounts.get(client.id) ?? 0,
        sessionCount: sessionCounts.get(client.id) ?? 0,
        revenue: revenueTotals.get(client.id) ?? 0,
      }))
      .filter(
        (client) => client.bookingCount > 0 || client.sessionCount > 0 || client.revenue > 0,
      )
      .sort((left, right) => right.revenue - left.revenue || left.clientName.localeCompare(right.clientName));

    return {
      from: toIso(from),
      to: toIso(to),
      clients: clientsWithActivity,
    };
  }

  async exportRevenueCsv(query: ReportsDateRangeQueryInput): Promise<string> {
    const report = await this.getRevenueReport(query);
    const lines = ["date,revenue,invoiceCount"];

    for (const row of report.dailyBreakdown) {
      lines.push(`${row.date},${row.revenue},${row.invoiceCount}`);
    }

    lines.push(`total,${report.totalRevenue},${report.invoiceCount}`);

    return `${lines.join("\n")}\n`;
  }

  async getCurrentMonthUtilizationPercent(): Promise<number> {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [studios, sessions] = await Promise.all([
      this.reportsRepository.findStudios(),
      this.reportsRepository.findCompletedSessionsInRange(from, to),
    ]);

    return computeUtilization(studios, sessions, from, to).overallPercent;
  }

  async getRecentRevenueTrend(days = 7): Promise<DashboardRevenueTrendPointDto[]> {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days);

    const invoices = await this.reportsRepository.findPaidInvoicesInRange(start, end);
    return buildRevenueTrend(invoices, start, end);
  }
}
