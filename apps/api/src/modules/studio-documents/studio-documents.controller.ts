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
  CreateStudioDocumentResponseDto,
  DeleteStudioDocumentResponseDto,
  GetStudioDocumentResponseDto,
  ListStudioDocumentsResponseDto,
  SyncStudioDocumentsPullResponseDto,
  UpdateStudioDocumentResponseDto,
} from "@st-manager/contracts";
import {
  createStudioDocumentSchema,
  listStudioDocumentsQuerySchema,
  syncStudioDocumentsPullQuerySchema,
  updateStudioDocumentSchema,
  type CreateStudioDocumentInput,
  type ListStudioDocumentsQueryInput,
  type SyncStudioDocumentsPullQueryInput,
  type UpdateStudioDocumentInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toStudioDocumentResponseDto } from "./studio-documents.mapper";
import { StudioDocumentsService } from "./studio-documents.service";

@Controller(ROUTES.STUDIO_DOCUMENTS)
@UseGuards(JwtAuthGuard)
export class StudioDocumentsController {
  constructor(private readonly studioDocumentsService: StudioDocumentsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStudioDocumentSchema)) body: CreateStudioDocumentInput,
  ): Promise<CreateStudioDocumentResponseDto> {
    const document = await this.studioDocumentsService.create(user, body);
    return { success: true, data: toStudioDocumentResponseDto(document) };
  }

  @Get("changes")
  async pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(syncStudioDocumentsPullQuerySchema))
    query: SyncStudioDocumentsPullQueryInput,
  ): Promise<SyncStudioDocumentsPullResponseDto> {
    const result = await this.studioDocumentsService.pullChanges(user, query);
    return {
      success: true,
      data: {
        records: result.data.map(toStudioDocumentResponseDto),
        serverTime: result.serverTime,
        hasMore: result.hasMore,
      },
    };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listStudioDocumentsQuerySchema))
    query: ListStudioDocumentsQueryInput,
  ): Promise<ListStudioDocumentsResponseDto> {
    const { data, meta } = await this.studioDocumentsService.list(user, query);
    return { success: true, data: data.map(toStudioDocumentResponseDto), meta };
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<GetStudioDocumentResponseDto> {
    const document = await this.studioDocumentsService.getById(user, id);
    return { success: true, data: toStudioDocumentResponseDto(document) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStudioDocumentSchema)) body: UpdateStudioDocumentInput,
  ): Promise<UpdateStudioDocumentResponseDto> {
    const document = await this.studioDocumentsService.update(user, id, body);
    return { success: true, data: toStudioDocumentResponseDto(document) };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<DeleteStudioDocumentResponseDto> {
    await this.studioDocumentsService.softDelete(user, id);
    return { success: true };
  }
}
