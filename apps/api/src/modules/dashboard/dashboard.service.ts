import { Injectable } from "@nestjs/common";
import type { DashboardSummaryDataDto } from "@st-manager/contracts";

import { toDashboardBookingSummaryDto } from "../bookings/bookings.mapper";
import { BookingsRepository } from "../bookings/bookings.repository";
import { toDashboardClientSummaryDto } from "../clients/clients.mapper";
import { ClientsRepository } from "../clients/clients.repository";
import { toDashboardInvoiceSummaryDto } from "../invoices/invoices.mapper";
import { InvoicesRepository } from "../invoices/invoices.repository";
import { ReportsService } from "../reports/reports.service";
import { toDashboardSessionSummaryDto } from "../sessions/sessions.mapper";
import { SessionsRepository } from "../sessions/sessions.repository";
import { toStudioResponseDto } from "../studios/studios.mapper";
import { StudiosRepository } from "../studios/studios.repository";

const RECENT_STUDIOS_LIMIT = 5;
const RECENT_CLIENTS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(
    private readonly studiosRepository: StudiosRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly bookingsRepository: BookingsRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly reportsService: ReportsService,
  ) {}

  async getSummary(): Promise<DashboardSummaryDataDto> {
    const [
      studioCount,
      recentStudios,
      clientCount,
      recentClients,
      todayBookings,
      sessionsInProgress,
      completedTodaySessions,
      outstandingInvoices,
      paidThisMonthInvoices,
      utilizationPercent,
      revenueTrend,
    ] = await Promise.all([
      this.studiosRepository.count(),
      this.studiosRepository.findMany({ skip: 0, take: RECENT_STUDIOS_LIMIT }),
      this.clientsRepository.count(),
      this.clientsRepository.findMany({ skip: 0, take: RECENT_CLIENTS_LIMIT }),
      this.bookingsRepository.findToday(),
      this.sessionsRepository.findInProgress(),
      this.sessionsRepository.findCompletedToday(),
      this.invoicesRepository.findOutstanding(),
      this.invoicesRepository.findPaidThisMonth(),
      this.reportsService.getCurrentMonthUtilizationPercent(),
      this.reportsService.getRecentRevenueTrend(),
    ]);

    const monthRevenue = paidThisMonthInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const outstandingBalance = outstandingInvoices.reduce((sum, invoice) => sum + invoice.total, 0);

    return {
      studioCount,
      recentStudios: recentStudios.map(toStudioResponseDto),
      todayBookings: todayBookings.map(toDashboardBookingSummaryDto),
      clientCount,
      recentClients: recentClients.map(toDashboardClientSummaryDto),
      sessionsInProgress: sessionsInProgress.map(toDashboardSessionSummaryDto),
      completedTodaySessions: completedTodaySessions.map(toDashboardSessionSummaryDto),
      monthRevenue,
      outstandingBalance,
      outstandingInvoices: outstandingInvoices.map(toDashboardInvoiceSummaryDto),
      paidThisMonthInvoices: paidThisMonthInvoices.map(toDashboardInvoiceSummaryDto),
      utilizationPercent,
      revenueTrend,
    };
  }
}
