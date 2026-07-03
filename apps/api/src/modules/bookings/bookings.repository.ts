import { Injectable } from "@nestjs/common";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { Booking, BookingWithRelations } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asBookingClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_BOOKING_FILTER = { status: "confirmed" } as const;

const bookingInclude = {
  studio: { select: { name: true } },
  client: { select: { name: true } },
} as const;

function mapBooking(record: {
  id: string;
  studioId: string;
  clientId: string | null;
  title: string;
  startAt: Date;
  endAt: Date;
  status: string;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  studio: { name: string };
  client: { name: string } | null;
}): BookingWithRelations {
  return {
    id: record.id,
    studioId: record.studioId,
    clientId: record.clientId,
    title: record.title,
    startAt: record.startAt,
    endAt: record.endAt,
    status: record.status as Booking["status"],
    notes: record.notes,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    studioName: record.studio.name,
    clientName: record.client?.name ?? null,
  };
}

@Injectable()
export class BookingsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: {
    studioId: string;
    clientId: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    notes: string | null;
  }): Promise<BookingWithRelations> {
    const client = asBookingClient(this.prismaService.getClient());
    const booking = await client.booking.create({
      data: {
        ...data,
        status: "confirmed",
      },
      include: bookingInclude,
    });

    return mapBooking(booking);
  }

  async findById(id: string): Promise<BookingWithRelations | null> {
    const client = asBookingClient(this.prismaService.getClient());
    const booking = await client.booking.findFirst({
      where: { id, ...ACTIVE_BOOKING_FILTER },
      include: bookingInclude,
    });

    return booking ? mapBooking(booking) : null;
  }

  async findManyInRange(params: {
    studioId: string;
    from: Date;
    to: Date;
  }): Promise<BookingWithRelations[]> {
    const client = asBookingClient(this.prismaService.getClient());
    const bookings = await client.booking.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_BOOKING_FILTER,
        startAt: { lt: params.to },
        endAt: { gt: params.from },
      },
      include: bookingInclude,
      orderBy: { startAt: "asc" },
    });

    return bookings.map(mapBooking);
  }

  async findOverlapping(params: {
    studioId: string;
    startAt: Date;
    endAt: Date;
    excludeId?: string;
  }): Promise<Booking[]> {
    const client = asBookingClient(this.prismaService.getClient());
    const bookings = await client.booking.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_BOOKING_FILTER,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
        startAt: { lt: params.endAt },
        endAt: { gt: params.startAt },
      },
    });

    return bookings.map((booking) => ({
      ...booking,
      status: booking.status as Booking["status"],
    }));
  }

  async findToday(): Promise<BookingWithRelations[]> {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const client = asBookingClient(this.prismaService.getClient());
    const bookings = await client.booking.findMany({
      where: {
        ...ACTIVE_BOOKING_FILTER,
        startAt: { lt: endOfDay },
        endAt: { gt: startOfDay },
      },
      include: bookingInclude,
      orderBy: { startAt: "asc" },
    });

    return bookings.map(mapBooking);
  }

  async update(
    id: string,
    data: Partial<{
      studioId: string;
      clientId: string | null;
      title: string;
      startAt: Date;
      endAt: Date;
      notes: string | null;
    }>,
  ): Promise<BookingWithRelations> {
    const client = asBookingClient(this.prismaService.getClient());
    const booking = await client.booking.update({
      where: { id },
      data,
      include: bookingInclude,
    });

    return mapBooking(booking);
  }

  async cancel(id: string): Promise<BookingWithRelations> {
    const client = asBookingClient(this.prismaService.getClient());
    const booking = await client.booking.update({
      where: { id },
      data: { status: "cancelled" },
      include: bookingInclude,
    });

    return mapBooking(booking);
  }
}
