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
  CreateBookingSlotDefinitionResponseDto,
  DeleteBookingSlotDefinitionResponseDto,
  GetBookingSlotDefinitionResponseDto,
  ListBookingSlotDefinitionsResponseDto,
  SyncBookingSlotDefinitionsPullResponseDto,
  UpdateBookingSlotDefinitionResponseDto,
} from "@st-manager/contracts";
import {
  createBookingSlotDefinitionSchema,
  listBookingSlotDefinitionsQuerySchema,
  syncBookingSlotDefinitionsPullQuerySchema,
  updateBookingSlotDefinitionSchema,
  type CreateBookingSlotDefinitionInput,
  type ListBookingSlotDefinitionsQueryInput,
  type SyncBookingSlotDefinitionsPullQueryInput,
  type UpdateBookingSlotDefinitionInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toBookingSlotDefinitionResponseDto } from "./booking-slot-definitions.mapper";
import { BookingSlotDefinitionsService } from "./booking-slot-definitions.service";

@Controller(ROUTES.BOOKING_SLOT_DEFINITIONS)
@UseGuards(JwtAuthGuard)
export class BookingSlotDefinitionsController {
  constructor(private readonly bookingSlotDefinitionsService: BookingSlotDefinitionsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createBookingSlotDefinitionSchema))
    body: CreateBookingSlotDefinitionInput,
  ): Promise<CreateBookingSlotDefinitionResponseDto> {
    const slot = await this.bookingSlotDefinitionsService.create(user, body);
    return { success: true, data: toBookingSlotDefinitionResponseDto(slot) };
  }

  @Get("changes")
  async pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(syncBookingSlotDefinitionsPullQuerySchema))
    query: SyncBookingSlotDefinitionsPullQueryInput,
  ): Promise<SyncBookingSlotDefinitionsPullResponseDto> {
    const result = await this.bookingSlotDefinitionsService.pullChanges(user, query);
    return {
      success: true,
      data: {
        records: result.data.map(toBookingSlotDefinitionResponseDto),
        serverTime: result.serverTime,
        hasMore: result.hasMore,
      },
    };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listBookingSlotDefinitionsQuerySchema))
    query: ListBookingSlotDefinitionsQueryInput,
  ): Promise<ListBookingSlotDefinitionsResponseDto> {
    const { data, meta } = await this.bookingSlotDefinitionsService.list(user, query);
    return { success: true, data: data.map(toBookingSlotDefinitionResponseDto), meta };
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<GetBookingSlotDefinitionResponseDto> {
    const slot = await this.bookingSlotDefinitionsService.getById(user, id);
    return { success: true, data: toBookingSlotDefinitionResponseDto(slot) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateBookingSlotDefinitionSchema))
    body: UpdateBookingSlotDefinitionInput,
  ): Promise<UpdateBookingSlotDefinitionResponseDto> {
    const slot = await this.bookingSlotDefinitionsService.update(user, id, body);
    return { success: true, data: toBookingSlotDefinitionResponseDto(slot) };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<DeleteBookingSlotDefinitionResponseDto> {
    await this.bookingSlotDefinitionsService.softDelete(user, id);
    return { success: true };
  }
}
