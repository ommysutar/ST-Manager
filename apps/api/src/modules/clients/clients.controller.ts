import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  CreateClientResponseDto,
  DeleteClientResponseDto,
  GetClientResponseDto,
  ListClientsResponseDto,
  SyncClientsPullResponseDto,
  UpdateClientResponseDto,
} from "@st-manager/contracts";
import {
  createClientSchema,
  listClientsQuerySchema,
  syncClientsPullQuerySchema,
  updateClientSchema,
  type CreateClientInput,
  type ListClientsQueryInput,
  type SyncClientsPullQueryInput,
  type UpdateClientInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toClientResponseDto } from "./clients.mapper";
import { ClientsService } from "./clients.service";

@Controller(ROUTES.CLIENTS)
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createClientSchema)) body: CreateClientInput,
  ): Promise<CreateClientResponseDto> {
    const client = await this.clientsService.create(user, body);
    return { success: true, data: toClientResponseDto(client) };
  }

  @Get("changes")
  async pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(syncClientsPullQuerySchema)) query: SyncClientsPullQueryInput,
  ): Promise<SyncClientsPullResponseDto> {
    const result = await this.clientsService.pullChanges(user, query);
    return {
      success: true,
      data: {
        records: result.data.map(toClientResponseDto),
        serverTime: result.serverTime,
        hasMore: result.hasMore,
      },
    };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listClientsQuerySchema)) query: ListClientsQueryInput,
  ): Promise<ListClientsResponseDto> {
    const { data, meta } = await this.clientsService.list(user, query);
    return { success: true, data: data.map(toClientResponseDto), meta };
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<GetClientResponseDto> {
    const client = await this.clientsService.getById(user, id);
    return { success: true, data: toClientResponseDto(client) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateClientSchema)) body: UpdateClientInput,
  ): Promise<UpdateClientResponseDto> {
    const client = await this.clientsService.update(user, id, body);
    return { success: true, data: toClientResponseDto(client) };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<DeleteClientResponseDto> {
    await this.clientsService.softDelete(user, id);
    return { success: true };
  }
}
