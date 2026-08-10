import { Controller, Get, Header, Query, UseGuards } from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  ClientActivityReportResponseDto,
  RevenueReportResponseDto,
  UtilizationReportResponseDto,
} from "@st-manager/contracts";
import { reportsDateRangeQuerySchema, type ReportsDateRangeQueryInput } from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ReportsService } from "./reports.service";

@Controller(ROUTES.REPORTS)
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("revenue")
  async getRevenueReport(
    @Query(new ZodValidationPipe(reportsDateRangeQuerySchema)) query: ReportsDateRangeQueryInput,
  ): Promise<RevenueReportResponseDto> {
    const data = await this.reportsService.getRevenueReport(query);
    return { success: true, data };
  }

  @Get("utilization")
  async getUtilizationReport(
    @Query(new ZodValidationPipe(reportsDateRangeQuerySchema)) query: ReportsDateRangeQueryInput,
  ): Promise<UtilizationReportResponseDto> {
    const data = await this.reportsService.getUtilizationReport(query);
    return { success: true, data };
  }

  @Get("clients")
  async getClientActivityReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(reportsDateRangeQuerySchema)) query: ReportsDateRangeQueryInput,
  ): Promise<ClientActivityReportResponseDto> {
    const data = await this.reportsService.getClientActivityReport(user, query);
    return { success: true, data };
  }

  @Get("revenue/export")
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", 'attachment; filename="revenue-report.csv"')
  async exportRevenueCsv(
    @Query(new ZodValidationPipe(reportsDateRangeQuerySchema)) query: ReportsDateRangeQueryInput,
  ): Promise<string> {
    return this.reportsService.exportRevenueCsv(query);
  }
}
