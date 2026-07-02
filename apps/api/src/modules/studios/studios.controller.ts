import { Body, Controller, Get, HttpCode, Post, Query } from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type { CreateStudioResponseDto, ListStudiosResponseDto } from "@st-manager/contracts";
import {
  createStudioSchema,
  listStudiosQuerySchema,
  type CreateStudioInput,
  type ListStudiosQueryInput,
} from "@st-manager/validation";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { toStudioResponseDto } from "./studios.mapper";
import { StudiosService } from "./studios.service";

/**
 * HTTP concerns only: routes, status codes, param/body extraction, and
 * DTO-mapping the domain result on the way out. All business logic and
 * Prisma access live in `StudiosService`/`StudiosRepository`.
 */
@Controller(ROUTES.STUDIOS)
export class StudiosController {
  constructor(private readonly studiosService: StudiosService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body(new ZodValidationPipe(createStudioSchema)) dto: CreateStudioInput,
  ): Promise<CreateStudioResponseDto> {
    const studio = await this.studiosService.create(dto);
    return { success: true, data: toStudioResponseDto(studio) };
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listStudiosQuerySchema)) query: ListStudiosQueryInput,
  ): Promise<ListStudiosResponseDto> {
    const { data, meta } = await this.studiosService.list(query);
    return { success: true, data: data.map(toStudioResponseDto), meta };
  }
}
