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
  CancelSessionResponseDto,
  CompleteSessionResponseDto,
  CreateSessionResponseDto,
  GetSessionResponseDto,
  ListSessionsResponseDto,
  StartSessionResponseDto,
  UpdateSessionResponseDto,
} from "@st-manager/contracts";
import {
  createSessionSchema,
  listSessionsQuerySchema,
  updateSessionSchema,
  type CreateSessionInput,
  type ListSessionsQueryInput,
  type UpdateSessionInput,
} from "@st-manager/validation";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toSessionResponseDto } from "./sessions.mapper";
import { SessionsService } from "./sessions.service";

@Controller(ROUTES.SESSIONS)
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body(new ZodValidationPipe(createSessionSchema)) body: CreateSessionInput,
  ): Promise<CreateSessionResponseDto> {
    const session = await this.sessionsService.create(body);
    return { success: true, data: toSessionResponseDto(session) };
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listSessionsQuerySchema)) query: ListSessionsQueryInput,
  ): Promise<ListSessionsResponseDto> {
    const result = await this.sessionsService.list(query);
    return {
      success: true,
      data: result.items.map(toSessionResponseDto),
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    };
  }

  @Post(":id/start")
  async start(@Param("id") id: string): Promise<StartSessionResponseDto> {
    const session = await this.sessionsService.start(id);
    return { success: true, data: toSessionResponseDto(session) };
  }

  @Post(":id/complete")
  async complete(@Param("id") id: string): Promise<CompleteSessionResponseDto> {
    const session = await this.sessionsService.complete(id);
    return { success: true, data: toSessionResponseDto(session) };
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<GetSessionResponseDto> {
    const session = await this.sessionsService.getById(id);
    return { success: true, data: toSessionResponseDto(session) };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSessionSchema)) body: UpdateSessionInput,
  ): Promise<UpdateSessionResponseDto> {
    const session = await this.sessionsService.update(id, body);
    return { success: true, data: toSessionResponseDto(session) };
  }

  @Delete(":id")
  @HttpCode(200)
  async cancel(@Param("id") id: string): Promise<CancelSessionResponseDto> {
    await this.sessionsService.cancel(id);
    return { success: true };
  }
}
