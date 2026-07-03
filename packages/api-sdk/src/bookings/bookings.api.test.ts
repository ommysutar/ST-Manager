import { ROUTES } from "@st-manager/constants";
import type { CreateBookingResponseDto, ListBookingsResponseDto } from "@st-manager/contracts";
import { describe, expect, it, vi } from "vitest";

import type { HttpClient } from "../client/types";
import { createBookingsApi } from "./bookings.api";

describe("createBookingsApi", () => {
  it("creates a booking via POST /bookings", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "booking-1",
        studioId: "studio-1",
        studioName: "Downtown",
        clientId: null,
        clientName: null,
        title: "Mix session",
        startAt: "2026-07-03T14:00:00.000Z",
        endAt: "2026-07-03T16:00:00.000Z",
        status: "confirmed",
        notes: null,
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    } satisfies CreateBookingResponseDto);

    const client: HttpClient = {
      get: vi.fn(),
      post,
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const bookingsApi = createBookingsApi(client);

    await expect(
      bookingsApi.createBooking({
        studioId: "studio-1",
        title: "Mix session",
        startAt: "2026-07-03T14:00:00.000Z",
        endAt: "2026-07-03T16:00:00.000Z",
      }),
    ).resolves.toMatchObject({ id: "booking-1", title: "Mix session" });

    expect(post).toHaveBeenCalledWith(ROUTES.BOOKINGS, {
      studioId: "studio-1",
      clientId: null,
      title: "Mix session",
      startAt: "2026-07-03T14:00:00.000Z",
      endAt: "2026-07-03T16:00:00.000Z",
      notes: null,
    });
  });

  it("lists bookings for a calendar range", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: [],
    } satisfies ListBookingsResponseDto);

    const client: HttpClient = {
      get,
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const bookingsApi = createBookingsApi(client);

    await bookingsApi.listBookings({
      studioId: "studio-1",
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-07T00:00:00.000Z",
    });

    expect(get).toHaveBeenCalledWith(ROUTES.BOOKINGS, {
      studioId: "studio-1",
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-07T00:00:00.000Z",
    });
  });
});
