import { Injectable } from "@nestjs/common";
import type { DashboardSummaryDataDto } from "@st-manager/contracts";

import { toStudioResponseDto } from "../studios/studios.mapper";
import { StudiosRepository } from "../studios/studios.repository";

const RECENT_STUDIOS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly studiosRepository: StudiosRepository) {}

  async getSummary(): Promise<DashboardSummaryDataDto> {
    const [studioCount, recentStudios] = await Promise.all([
      this.studiosRepository.count(),
      this.studiosRepository.findMany({ skip: 0, take: RECENT_STUDIOS_LIMIT }),
    ]);

    return {
      studioCount,
      recentStudios: recentStudios.map(toStudioResponseDto),
      todayBookings: [],
      clientCount: 0,
      monthRevenue: 0,
      utilizationPercent: 0,
    };
  }
}
