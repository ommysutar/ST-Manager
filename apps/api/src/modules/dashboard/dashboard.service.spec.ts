import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { BookingsRepository } from "../bookings/bookings.repository";
import { ClientsRepository } from "../clients/clients.repository";
import { InvoicesRepository } from "../invoices/invoices.repository";
import { ReportsService } from "../reports/reports.service";
import { SessionsRepository } from "../sessions/sessions.repository";
import { StudiosRepository } from "../studios/studios.repository";
import { DashboardService } from "./dashboard.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

describe("DashboardService", () => {
  let service: DashboardService;
  let studiosRepository: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  let clientsRepository: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  let bookingsRepository: {
    findToday: ReturnType<typeof vi.fn>;
  };
  let sessionsRepository: {
    findInProgress: ReturnType<typeof vi.fn>;
    findCompletedToday: ReturnType<typeof vi.fn>;
  };
  let invoicesRepository: {
    findOutstanding: ReturnType<typeof vi.fn>;
    findPaidThisMonth: ReturnType<typeof vi.fn>;
  };
  let reportsService: {
    getCurrentMonthUtilizationPercent: ReturnType<typeof vi.fn>;
    getRecentRevenueTrend: ReturnType<typeof vi.fn>;
  };
  let authRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    studiosRepository = {
      count: vi.fn(),
      findMany: vi.fn(),
    };
    clientsRepository = {
      count: vi.fn(),
      findMany: vi.fn(),
    };
    bookingsRepository = {
      findToday: vi.fn(),
    };
    sessionsRepository = {
      findInProgress: vi.fn(),
      findCompletedToday: vi.fn(),
    };
    invoicesRepository = {
      findOutstanding: vi.fn(),
      findPaidThisMonth: vi.fn(),
    };
    reportsService = {
      getCurrentMonthUtilizationPercent: vi.fn(),
      getRecentRevenueTrend: vi.fn(),
    };
    authRepository = {
      findById: vi.fn().mockResolvedValue({ id: "user-1", studioId: "studio-1" }),
    };

    service = new DashboardService(
      studiosRepository as unknown as StudiosRepository,
      clientsRepository as unknown as ClientsRepository,
      bookingsRepository as unknown as BookingsRepository,
      sessionsRepository as unknown as SessionsRepository,
      invoicesRepository as unknown as InvoicesRepository,
      reportsService as unknown as ReportsService,
      authRepository as unknown as AuthRepository,
    );
  });

  it("aggregates studio, client, booking, session, and invoice KPIs", async () => {
    const studio = {
      id: "studio-1",
      name: "Downtown Studio",
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    };
    const client = {
      id: "client-1",
      studioId: "studio-1",
      name: "Acme Records",
      email: null,
      phone: null,
      whatsappNumber: null,
      whatsappSameAsPhone: false,
      company: "Acme",
      notes: null,
      deletedAt: null,
      createdAt: new Date("2026-07-03T01:00:00.000Z"),
      updatedAt: new Date("2026-07-03T01:00:00.000Z"),
    };
    const booking = {
      id: "booking-1",
      studioId: "studio-1",
      clientId: null,
      title: "Mix session",
      startAt: new Date("2026-07-03T14:00:00.000Z"),
      endAt: new Date("2026-07-03T16:00:00.000Z"),
      status: "confirmed" as const,
      notes: null,
      deletedAt: null,
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      updatedAt: new Date("2026-07-03T00:00:00.000Z"),
      studioName: "Downtown Studio",
      clientName: null,
    };
    const session = {
      id: "session-1",
      studioId: "studio-1",
      clientId: null,
      bookingId: null,
      title: "Tracking session",
      startedAt: new Date("2026-07-03T14:00:00.000Z"),
      endedAt: null,
      status: "in_progress" as const,
      notes: null,
      deletedAt: null,
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      updatedAt: new Date("2026-07-03T00:00:00.000Z"),
      studioName: "Downtown Studio",
      clientName: null,
      bookingTitle: null,
    };
    const outstandingInvoice = {
      id: "invoice-1",
      clientId: "client-1",
      sessionId: null,
      number: "000001",
      status: "sent" as const,
      lineItems: [],
      subtotal: 200,
      taxRate: 0,
      tax: 0,
      total: 200,
      dueDate: new Date("2026-07-10T00:00:00.000Z"),
      issuedAt: new Date("2026-07-03T10:00:00.000Z"),
      paidAt: null,
      notes: null,
      deletedAt: null,
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      updatedAt: new Date("2026-07-03T00:00:00.000Z"),
      clientName: "Acme Records",
      sessionTitle: null,
    };
    const paidInvoice = {
      ...outstandingInvoice,
      id: "invoice-2",
      number: "000002",
      status: "paid" as const,
      total: 150,
      paidAt: new Date("2026-07-03T12:00:00.000Z"),
    };

    studiosRepository.count.mockResolvedValue(3);
    studiosRepository.findMany.mockResolvedValue([studio]);
    clientsRepository.count.mockResolvedValue(2);
    clientsRepository.findMany.mockResolvedValue([client]);
    bookingsRepository.findToday.mockResolvedValue([booking]);
    sessionsRepository.findInProgress.mockResolvedValue([session]);
    sessionsRepository.findCompletedToday.mockResolvedValue([]);
    invoicesRepository.findOutstanding.mockResolvedValue([outstandingInvoice]);
    invoicesRepository.findPaidThisMonth.mockResolvedValue([paidInvoice]);
    reportsService.getCurrentMonthUtilizationPercent.mockResolvedValue(12.5);
    reportsService.getRecentRevenueTrend.mockResolvedValue([
      { date: "2026-07-01", revenue: 0 },
      { date: "2026-07-02", revenue: 150 },
    ]);

    await expect(service.getSummary(actor)).resolves.toEqual({
      studioCount: 3,
      recentStudios: [
        {
          id: "studio-1",
          name: "Downtown Studio",
          createdAt: "2026-07-03T00:00:00.000Z",
          updatedAt: "2026-07-03T00:00:00.000Z",
        },
      ],
      todayBookings: [
        {
          id: "booking-1",
          title: "Mix session",
          studioId: "studio-1",
          studioName: "Downtown Studio",
          startAt: "2026-07-03T14:00:00.000Z",
          endAt: "2026-07-03T16:00:00.000Z",
        },
      ],
      clientCount: 2,
      recentClients: [
        {
          id: "client-1",
          name: "Acme Records",
          company: "Acme",
          createdAt: "2026-07-03T01:00:00.000Z",
        },
      ],
      sessionsInProgress: [
        {
          id: "session-1",
          title: "Tracking session",
          studioId: "studio-1",
          studioName: "Downtown Studio",
          clientName: null,
          startedAt: "2026-07-03T14:00:00.000Z",
          status: "in_progress",
        },
      ],
      completedTodaySessions: [],
      monthRevenue: 150,
      outstandingBalance: 200,
      outstandingInvoices: [
        {
          id: "invoice-1",
          number: "000001",
          clientName: "Acme Records",
          total: 200,
          status: "sent",
          dueDate: "2026-07-10T00:00:00.000Z",
          paidAt: null,
        },
      ],
      paidThisMonthInvoices: [
        {
          id: "invoice-2",
          number: "000002",
          clientName: "Acme Records",
          total: 150,
          status: "paid",
          dueDate: "2026-07-10T00:00:00.000Z",
          paidAt: "2026-07-03T12:00:00.000Z",
        },
      ],
      utilizationPercent: 12.5,
      revenueTrend: [
        { date: "2026-07-01", revenue: 0 },
        { date: "2026-07-02", revenue: 150 },
      ],
    });

    expect(clientsRepository.count).toHaveBeenCalledWith("studio-1");
    expect(clientsRepository.findMany).toHaveBeenCalledWith({
      studioId: "studio-1",
      skip: 0,
      take: 5,
    });
  });

  it("returns empty recent collections when none exist", async () => {
    studiosRepository.count.mockResolvedValue(0);
    studiosRepository.findMany.mockResolvedValue([]);
    clientsRepository.count.mockResolvedValue(0);
    clientsRepository.findMany.mockResolvedValue([]);
    bookingsRepository.findToday.mockResolvedValue([]);
    sessionsRepository.findInProgress.mockResolvedValue([]);
    sessionsRepository.findCompletedToday.mockResolvedValue([]);
    invoicesRepository.findOutstanding.mockResolvedValue([]);
    invoicesRepository.findPaidThisMonth.mockResolvedValue([]);
    reportsService.getCurrentMonthUtilizationPercent.mockResolvedValue(0);
    reportsService.getRecentRevenueTrend.mockResolvedValue([]);

    const summary = await service.getSummary(actor);

    expect(summary.recentStudios).toEqual([]);
    expect(summary.recentClients).toEqual([]);
    expect(summary.todayBookings).toEqual([]);
    expect(summary.sessionsInProgress).toEqual([]);
    expect(summary.completedTodaySessions).toEqual([]);
    expect(summary.outstandingInvoices).toEqual([]);
    expect(summary.paidThisMonthInvoices).toEqual([]);
    expect(summary.monthRevenue).toBe(0);
    expect(summary.outstandingBalance).toBe(0);
  });
});
