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
  CancelBookingResponseDto,
  CreateBookingResponseDto,
  GetBookingResponseDto,
  ListBookingsResponseDto,
  UpdateBookingResponseDto,
} from "@st-manager/contracts";
import {
  createBookingSchema,
  listBookingsQuerySchema,
  updateBookingSchema,
  type CreateBookingInput,
  type ListBookingsQueryInput,
  type UpdateBookingInput,
} from "@st-manager/validation";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toBookingResponseDto } from "./bookings.mapper";
import { BookingsService } from "./bookings.service";

@Controller(ROUTES.BOOKINGS)
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body(new ZodValidationPipe(createBookingSchema)) body: CreateBookingInput,
  ): Promise<CreateBookingResponseDto> {
    const booking = await this.bookingsService.create(body);
    return { success: true, data: toBookingResponseDto(booking) };
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listBookingsQuerySchema)) query: ListBookingsQueryInput,
  ): Promise<ListBookingsResponseDto> {
    const bookings = await this.bookingsService.listByRange(query);
    return { success: true, data: bookings.map(toBookingResponseDto) };
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<GetBookingResponseDto> {
    const booking = await this.bookingsService.getById(id);
    return { success: true, data: toBookingResponseDto(booking) };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateBookingSchema)) body: UpdateBookingInput,
  ): Promise<UpdateBookingResponseDto> {
    const booking = await this.bookingsService.update(id, body);
    return { success: true, data: toBookingResponseDto(booking) };
  }

  @Delete(":id")
  @HttpCode(200)
  async cancel(@Param("id") id: string): Promise<CancelBookingResponseDto> {
    await this.bookingsService.cancel(id);
    return { success: true };
  }
}
