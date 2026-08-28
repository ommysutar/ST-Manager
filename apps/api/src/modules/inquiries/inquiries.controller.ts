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
  CreateInquiryResponseDto,
  DeleteInquiryResponseDto,
  GetInquiryResponseDto,
  ListInquiriesResponseDto,
  SyncInquiriesPullResponseDto,
  UpdateInquiryResponseDto,
} from "@st-manager/contracts";
import {
  createInquirySchema,
  listInquiriesQuerySchema,
  syncInquiriesPullQuerySchema,
  updateInquirySchema,
  type CreateInquiryInput,
  type ListInquiriesQueryInput,
  type SyncInquiriesPullQueryInput,
  type UpdateInquiryInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toInquiryResponseDto } from "./inquiries.mapper";
import { InquiriesService } from "./inquiries.service";

@Controller(ROUTES.INQUIRIES)
@UseGuards(JwtAuthGuard)
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createInquirySchema)) body: CreateInquiryInput,
  ): Promise<CreateInquiryResponseDto> {
    const inquiry = await this.inquiriesService.create(user, body);
    return { success: true, data: toInquiryResponseDto(inquiry) };
  }

  @Get("changes")
  async pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(syncInquiriesPullQuerySchema)) query: SyncInquiriesPullQueryInput,
  ): Promise<SyncInquiriesPullResponseDto> {
    const result = await this.inquiriesService.pullChanges(user, query);
    return {
      success: true,
      data: {
        records: result.data.map(toInquiryResponseDto),
        serverTime: result.serverTime,
        hasMore: result.hasMore,
      },
    };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listInquiriesQuerySchema)) query: ListInquiriesQueryInput,
  ): Promise<ListInquiriesResponseDto> {
    const { data, meta } = await this.inquiriesService.list(user, query);
    return { success: true, data: data.map(toInquiryResponseDto), meta };
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<GetInquiryResponseDto> {
    const inquiry = await this.inquiriesService.getById(user, id);
    return { success: true, data: toInquiryResponseDto(inquiry) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateInquirySchema)) body: UpdateInquiryInput,
  ): Promise<UpdateInquiryResponseDto> {
    const inquiry = await this.inquiriesService.update(user, id, body);
    return { success: true, data: toInquiryResponseDto(inquiry) };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<DeleteInquiryResponseDto> {
    await this.inquiriesService.softDelete(user, id);
    return { success: true };
  }
}
