import { Injectable } from "@nestjs/common";
import type { DashboardSummaryDataDto } from "@st-manager/contracts";

import { toDashboardBookingSummaryDto } from "../bookings/bookings.mapper";
import { BookingsRepository } from "../bookings/bookings.repository";
import { toDashboardClientSummaryDto } from "../clients/clients.mapper";
import { ClientsRepository } from "../clients/clients.repository";
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
  ) {}

  async getSummary(): Promise<DashboardSummaryDataDto> {
    const [studioCount, recentStudios, clientCount, recentClients, todayBookings] =
      await Promise.all([
        this.studiosRepository.count(),
        this.studiosRepository.findMany({ skip: 0, take: RECENT_STUDIOS_LIMIT }),
        this.clientsRepository.count(),
        this.clientsRepository.findMany({ skip: 0, take: RECENT_CLIENTS_LIMIT }),
        this.bookingsRepository.findToday(),
      ]);

    return {
      studioCount,
      recentStudios: recentStudios.map(toStudioResponseDto),
      todayBookings: todayBookings.map(toDashboardBookingSummaryDto),
      clientCount,
      recentClients: recentClients.map(toDashboardClientSummaryDto),
      monthRevenue: 0,
      utilizationPercent: 0,
    };
  }
}
