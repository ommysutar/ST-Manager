import { Controller, Get, UseGuards } from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type { DashboardSummaryResponseDto } from "@st-manager/contracts";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DashboardService } from "./dashboard.service";

@Controller(ROUTES.DASHBOARD)
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  async getSummary(): Promise<DashboardSummaryResponseDto> {
    const data = await this.dashboardService.getSummary();
    return { success: true, data };
  }
}
