import { describe, expect, it } from "vitest";

import { createBookingSchema, listBookingsQuerySchema, updateBookingSchema } from "./booking.schema";

describe("createBookingSchema", () => {
  it("accepts a valid booking payload", () => {
    const result = createBookingSchema.safeParse({
      studioId: "studio-1",
      title: "Mix session",
      startAt: "2026-07-03T14:00:00.000Z",
      endAt: "2026-07-03T16:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects intervals shorter than 15 minutes", () => {
    const result = createBookingSchema.safeParse({
      studioId: "studio-1",
      title: "Mix session",
      startAt: "2026-07-03T14:00:00.000Z",
      endAt: "2026-07-03T14:10:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateBookingSchema", () => {
  it("requires at least one field", () => {
    const result = updateBookingSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("accepts partial updates", () => {
    const result = updateBookingSchema.safeParse({ title: "Updated title" });

    expect(result.success).toBe(true);
  });
});

describe("listBookingsQuerySchema", () => {
  it("requires a valid range", () => {
    const result = listBookingsQuerySchema.safeParse({
      studioId: "studio-1",
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-07T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects inverted ranges", () => {
    const result = listBookingsQuerySchema.safeParse({
      studioId: "studio-1",
      from: "2026-07-07T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
