import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  PlatformActivationCodeActionResponseDto,
  PlatformActivationCodeListResponseDto,
  PlatformActivationCodesExportResponseDto,
  PlatformAdminDashboardResponseDto,
  PlatformAdminLoginResponseDto,
  PlatformAuditLogListResponseDto,
  PlatformGenerateActivationCodesResponseDto,
  PlatformGenerateLicensesResponseDto,
  PlatformLicenseActionResponseDto,
  PlatformLicenseListResponseDto,
  PlatformLicensesExportResponseDto,
  PlatformStudioActionResponseDto,
  PlatformStudioDetailResponseDto,
  PlatformStudioListResponseDto,
} from "@st-manager/contracts";
import {
  loginSchema,
  platformActivationCodeListQuerySchema,
  platformDeleteActivationCodeSchema,
  platformDeleteLicenseSchema,
  platformDeleteStudioSchema,
  platformGenerateActivationCodesSchema,
  platformGenerateLicensesSchema,
  platformLicenseListQuerySchema,
  platformStudioListQuerySchema,
  type LoginInput,
  type PlatformActivationCodeListQueryInput,
  type PlatformDeleteActivationCodeInput,
  type PlatformDeleteLicenseInput,
  type PlatformDeleteStudioInput,
  type PlatformGenerateActivationCodesInput,
  type PlatformGenerateLicensesInput,
  type PlatformLicenseListQueryInput,
  type PlatformStudioListQueryInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { PlatformAdminService } from "./platform-admin.service";

@Controller(ROUTES.PLATFORM_ADMIN)
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Post("auth/login")
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
  ): Promise<PlatformAdminLoginResponseDto> {
    const data = await this.platformAdminService.login(body);
    return { success: true, data };
  }

  @Get("dashboard")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async dashboard(): Promise<PlatformAdminDashboardResponseDto> {
    const data = await this.platformAdminService.getDashboard();
    return { success: true, data };
  }

  @Get("studios")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async listStudios(
    @Query(new ZodValidationPipe(platformStudioListQuerySchema))
    query: PlatformStudioListQueryInput,
  ): Promise<PlatformStudioListResponseDto> {
    const result = await this.platformAdminService.listStudios(query);
    return { success: true, ...result };
  }

  @Get("studios/:id")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async getStudio(@Param("id") id: string): Promise<PlatformStudioDetailResponseDto> {
    const data = await this.platformAdminService.getStudio(id);
    return { success: true, data };
  }

  @Post("studios/:id/disable")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async disableStudio(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformStudioActionResponseDto> {
    const data = await this.platformAdminService.disableStudio(id, user);
    return { success: true, data };
  }

  @Post("studios/:id/enable")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async enableStudio(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformStudioActionResponseDto> {
    const data = await this.platformAdminService.enableStudio(id, user);
    return { success: true, data };
  }

  @Post("studios/:id/delete")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async deleteStudio(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(platformDeleteStudioSchema)) body: PlatformDeleteStudioInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformStudioActionResponseDto> {
    const data = await this.platformAdminService.deleteStudio(id, body, user);
    return { success: true, data };
  }

  @Get("audit-logs")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async auditLogs(): Promise<PlatformAuditLogListResponseDto> {
    const data = await this.platformAdminService.listAuditLogs();
    return { success: true, data };
  }

  @Get("activation-codes")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async listActivationCodes(
    @Query(new ZodValidationPipe(platformActivationCodeListQuerySchema))
    query: PlatformActivationCodeListQueryInput,
  ): Promise<PlatformActivationCodeListResponseDto> {
    const result = await this.platformAdminService.listActivationCodes(query);
    return { success: true, ...result };
  }

  @Get("activation-codes/export")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async exportActivationCodes(): Promise<PlatformActivationCodesExportResponseDto> {
    const data = await this.platformAdminService.exportActivationCodesCsv();
    return { success: true, data };
  }

  @Post("activation-codes/generate")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async generateActivationCodes(
    @Body(new ZodValidationPipe(platformGenerateActivationCodesSchema))
    body: PlatformGenerateActivationCodesInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformGenerateActivationCodesResponseDto> {
    const codes = await this.platformAdminService.generateActivationCodes(body, user);
    return { success: true, data: { codes } };
  }

  @Post("activation-codes/:id/disable")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async disableActivationCode(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformActivationCodeActionResponseDto> {
    const data = await this.platformAdminService.disableActivationCode(id, user);
    return { success: true, data };
  }

  @Post("activation-codes/:id/enable")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async enableActivationCode(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformActivationCodeActionResponseDto> {
    const data = await this.platformAdminService.enableActivationCode(id, user);
    return { success: true, data };
  }

  @Post("activation-codes/:id/delete")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async deleteActivationCode(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(platformDeleteActivationCodeSchema))
    body: PlatformDeleteActivationCodeInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: true }> {
    await this.platformAdminService.deleteActivationCode(id, body, user);
    return { success: true };
  }

  @Get("licenses")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async listLicenses(
    @Query(new ZodValidationPipe(platformLicenseListQuerySchema))
    query: PlatformLicenseListQueryInput,
  ): Promise<PlatformLicenseListResponseDto> {
    const result = await this.platformAdminService.listLicenses(query);
    return { success: true, ...result };
  }

  @Get("licenses/export")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async exportLicenses(): Promise<PlatformLicensesExportResponseDto> {
    const data = await this.platformAdminService.exportLicensesCsv();
    return { success: true, data };
  }

  @Post("licenses/generate")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async generateLicenses(
    @Body(new ZodValidationPipe(platformGenerateLicensesSchema))
    body: PlatformGenerateLicensesInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformGenerateLicensesResponseDto> {
    const licenses = await this.platformAdminService.generateLicenses(body, user);
    return { success: true, data: { licenses } };
  }

  @Post("licenses/:id/disable")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async disableLicense(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformLicenseActionResponseDto> {
    const data = await this.platformAdminService.disableLicense(id, user);
    return { success: true, data };
  }

  @Post("licenses/:id/enable")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async enableLicense(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformLicenseActionResponseDto> {
    const data = await this.platformAdminService.enableLicense(id, user);
    return { success: true, data };
  }

  @Post("licenses/:id/revoke")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async revokeLicense(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformLicenseActionResponseDto> {
    const data = await this.platformAdminService.revokeLicense(id, user);
    return { success: true, data };
  }

  @Post("licenses/:id/duplicate")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async duplicateLicense(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformLicenseActionResponseDto> {
    const data = await this.platformAdminService.duplicateLicense(id, user);
    return { success: true, data };
  }

  @Post("licenses/:id/delete")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async deleteLicense(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(platformDeleteLicenseSchema)) body: PlatformDeleteLicenseInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: true }> {
    await this.platformAdminService.deleteLicense(id, body, user);
    return { success: true };
  }
}
