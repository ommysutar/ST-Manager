import { describe, expect, it } from "vitest";

import {
  createSessionSchema,
  listSessionsQuerySchema,
  updateSessionSchema,
} from "./session.schema";

describe("createSessionSchema", () => {
  it("accepts ad hoc session fields", () => {
    const result = createSessionSchema.parse({
      studioId: "studio-1",
      title: "Tracking session",
      startedAt: "2026-07-03T14:00:00.000Z",
      notes: "Bring stems",
    });

    expect(result).toMatchObject({
      studioId: "studio-1",
      title: "Tracking session",
      notes: "Bring stems",
    });
  });

  it("accepts booking conversion with bookingId only", () => {
    const result = createSessionSchema.parse({
      bookingId: "booking-1",
    });

    expect(result.bookingId).toBe("booking-1");
  });

  it("accepts explicit null optional fields from api-sdk payloads", () => {
    const result = createSessionSchema.parse({
      clientId: null,
      bookingId: "booking-1",
      notes: null,
    });

    expect(result).toMatchObject({
      clientId: null,
      bookingId: "booking-1",
      notes: null,
    });
  });

  it("normalizes empty notes to null", () => {
    const result = createSessionSchema.parse({
      studioId: "studio-1",
      title: "Mix",
      startedAt: "2026-07-03T14:00:00.000Z",
      notes: "",
    });

    expect(result.notes).toBeNull();
  });
});

describe("updateSessionSchema", () => {
  it("requires at least one field", () => {
    expect(() => updateSessionSchema.parse({})).toThrow();
  });

  it("accepts notes update", () => {
    const result = updateSessionSchema.parse({ notes: "Updated notes" });
    expect(result.notes).toBe("Updated notes");
  });
});

describe("listSessionsQuerySchema", () => {
  it("applies pagination defaults", () => {
    const result = listSessionsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBeGreaterThan(0);
  });

  it("accepts status and booking filters", () => {
    const result = listSessionsQuerySchema.parse({
      status: "in_progress",
      bookingId: "booking-1",
    });

    expect(result.status).toBe("in_progress");
    expect(result.bookingId).toBe("booking-1");
  });
});
