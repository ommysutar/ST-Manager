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
  CreatePaymentResponseDto,
  DeletePaymentResponseDto,
  GetPaymentResponseDto,
  ListPaymentsResponseDto,
  SyncPaymentsPullResponseDto,
  UpdatePaymentResponseDto,
} from "@st-manager/contracts";
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  syncPaymentsPullQuerySchema,
  updatePaymentSchema,
  type CreatePaymentInput,
  type ListPaymentsQueryInput,
  type SyncPaymentsPullQueryInput,
  type UpdatePaymentInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toPaymentResponseDto } from "./payments.mapper";
import { PaymentsService } from "./payments.service";

@Controller(ROUTES.PAYMENTS)
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentInput,
  ): Promise<CreatePaymentResponseDto> {
    const payment = await this.paymentsService.create(user, body);
    return { success: true, data: toPaymentResponseDto(payment) };
  }

  @Get("changes")
  async pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(syncPaymentsPullQuerySchema))
    query: SyncPaymentsPullQueryInput,
  ): Promise<SyncPaymentsPullResponseDto> {
    const result = await this.paymentsService.pullChanges(user, query);
    return {
      success: true,
      data: {
        records: result.data.map(toPaymentResponseDto),
        serverTime: result.serverTime,
        hasMore: result.hasMore,
      },
    };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listPaymentsQuerySchema)) query: ListPaymentsQueryInput,
  ): Promise<ListPaymentsResponseDto> {
    const { data, meta } = await this.paymentsService.list(user, query);
    return { success: true, data: data.map(toPaymentResponseDto), meta };
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<GetPaymentResponseDto> {
    const payment = await this.paymentsService.getById(user, id);
    return { success: true, data: toPaymentResponseDto(payment) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePaymentSchema)) body: UpdatePaymentInput,
  ): Promise<UpdatePaymentResponseDto> {
    const payment = await this.paymentsService.update(user, id, body);
    return { success: true, data: toPaymentResponseDto(payment) };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<DeletePaymentResponseDto> {
    await this.paymentsService.softDelete(user, id);
    return { success: true };
  }
}
