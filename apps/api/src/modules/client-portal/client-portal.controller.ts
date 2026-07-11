import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  ClientPortalAccessResponseDto,
  ClientPortalCreateResponseDto,
  ClientPortalMetaResponseDto,
} from "@st-manager/contracts";
import {
  clientPortalCreateOrSyncSchema,
  clientPortalEmailSchema,
  type ClientPortalCreateOrSyncInput,
  type ClientPortalEmailInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ClientPortalService } from "./client-portal.service";

@Controller(ROUTES.CLIENT_PORTAL)
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  @Get("access/:token")
  @Header("X-Robots-Tag", "noindex, nofollow, noarchive")
  @Header("Cache-Control", "no-store")
  async access(@Param("token") token: string): Promise<ClientPortalAccessResponseDto> {
    const data = await this.clientPortalService.accessByToken(token);
    return { success: true, data };
  }

  @Get("projects/:projectKey")
  @UseGuards(JwtAuthGuard)
  async getMeta(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectKey") projectKey: string,
  ): Promise<ClientPortalMetaResponseDto> {
    const data = await this.clientPortalService.getMeta(user, projectKey);
    return { success: true, data };
  }

  @Post("projects/:projectKey/create")
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectKey") projectKey: string,
    @Body(new ZodValidationPipe(clientPortalCreateOrSyncSchema)) body: ClientPortalCreateOrSyncInput,
  ): Promise<ClientPortalCreateResponseDto> {
    const data = await this.clientPortalService.create(user, projectKey, body);
    return { success: true, data };
  }

  @Post("projects/:projectKey/regenerate")
  @UseGuards(JwtAuthGuard)
  async regenerate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectKey") projectKey: string,
    @Body(new ZodValidationPipe(clientPortalCreateOrSyncSchema)) body: ClientPortalCreateOrSyncInput,
  ): Promise<ClientPortalCreateResponseDto> {
    const data = await this.clientPortalService.regenerate(user, projectKey, body);
    return { success: true, data };
  }

  @Post("projects/:projectKey/sync")
  @UseGuards(JwtAuthGuard)
  async sync(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectKey") projectKey: string,
    @Body(new ZodValidationPipe(clientPortalCreateOrSyncSchema)) body: ClientPortalCreateOrSyncInput,
  ): Promise<ClientPortalMetaResponseDto> {
    const data = await this.clientPortalService.syncSnapshot(user, projectKey, body);
    return { success: true, data };
  }

  @Post("projects/:projectKey/disable")
  @UseGuards(JwtAuthGuard)
  async disable(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectKey") projectKey: string,
  ): Promise<ClientPortalMetaResponseDto> {
    const data = await this.clientPortalService.disable(user, projectKey);
    return { success: true, data };
  }

  @Post("projects/:projectKey/enable")
  @UseGuards(JwtAuthGuard)
  async enable(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectKey") projectKey: string,
  ): Promise<ClientPortalMetaResponseDto> {
    const data = await this.clientPortalService.enable(user, projectKey);
    return { success: true, data };
  }

  @Post("projects/:projectKey/email")
  @UseGuards(JwtAuthGuard)
  async email(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectKey") projectKey: string,
    @Body(new ZodValidationPipe(clientPortalEmailSchema)) body: ClientPortalEmailInput,
  ): Promise<{ success: true }> {
    await this.clientPortalService.sendEmail(user, projectKey, body, body.portalUrl);
    return { success: true };
  }
}
