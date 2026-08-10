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
  CreateInvoiceResponseDto,
  GetInvoiceResponseDto,
  ListInvoicesResponseDto,
  MarkInvoicePaidResponseDto,
  SendInvoiceResponseDto,
  UpdateInvoiceResponseDto,
  VoidInvoiceResponseDto,
} from "@st-manager/contracts";
import {
  createInvoiceSchema,
  listInvoicesQuerySchema,
  updateInvoiceSchema,
  type CreateInvoiceInput,
  type ListInvoicesQueryInput,
  type UpdateInvoiceInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toInvoiceResponseDto } from "./invoices.mapper";
import { InvoicesService } from "./invoices.service";

@Controller(ROUTES.INVOICES)
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createInvoiceSchema)) body: CreateInvoiceInput,
  ): Promise<CreateInvoiceResponseDto> {
    const invoice = await this.invoicesService.create(user, body);
    return { success: true, data: toInvoiceResponseDto(invoice) };
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listInvoicesQuerySchema)) query: ListInvoicesQueryInput,
  ): Promise<ListInvoicesResponseDto> {
    const result = await this.invoicesService.list(query);
    return {
      success: true,
      data: result.items.map(toInvoiceResponseDto),
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    };
  }

  @Post(":id/send")
  async send(@Param("id") id: string): Promise<SendInvoiceResponseDto> {
    const invoice = await this.invoicesService.send(id);
    return { success: true, data: toInvoiceResponseDto(invoice) };
  }

  @Post(":id/mark-paid")
  async markPaid(@Param("id") id: string): Promise<MarkInvoicePaidResponseDto> {
    const invoice = await this.invoicesService.markPaid(id);
    return { success: true, data: toInvoiceResponseDto(invoice) };
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<GetInvoiceResponseDto> {
    const invoice = await this.invoicesService.getById(id);
    return { success: true, data: toInvoiceResponseDto(invoice) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateInvoiceSchema)) body: UpdateInvoiceInput,
  ): Promise<UpdateInvoiceResponseDto> {
    const invoice = await this.invoicesService.update(user, id, body);
    return { success: true, data: toInvoiceResponseDto(invoice) };
  }

  @Delete(":id")
  @HttpCode(200)
  async void(@Param("id") id: string): Promise<VoidInvoiceResponseDto> {
    await this.invoicesService.void(id);
    return { success: true };
  }
}
