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
  UpdateClientResponseDto,
} from "@st-manager/contracts";
import {
  createClientSchema,
  listClientsQuerySchema,
  updateClientSchema,
  type CreateClientInput,
  type ListClientsQueryInput,
  type UpdateClientInput,
} from "@st-manager/validation";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
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
    @Body(new ZodValidationPipe(createClientSchema)) body: CreateClientInput,
  ): Promise<CreateClientResponseDto> {
    const client = await this.clientsService.create(body);
    return { success: true, data: toClientResponseDto(client) };
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listClientsQuerySchema)) query: ListClientsQueryInput,
  ): Promise<ListClientsResponseDto> {
    const { data, meta } = await this.clientsService.list(query);
    return { success: true, data: data.map(toClientResponseDto), meta };
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<GetClientResponseDto> {
    const client = await this.clientsService.getById(id);
    return { success: true, data: toClientResponseDto(client) };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateClientSchema)) body: UpdateClientInput,
  ): Promise<UpdateClientResponseDto> {
    const client = await this.clientsService.update(id, body);
    return { success: true, data: toClientResponseDto(client) };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(@Param("id") id: string): Promise<DeleteClientResponseDto> {
    await this.clientsService.softDelete(id);
    return { success: true };
  }
}
