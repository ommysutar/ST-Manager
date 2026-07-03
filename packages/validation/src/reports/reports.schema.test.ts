import { describe, expect, it } from "vitest";

import { reportsDateRangeQuerySchema } from "./reports.schema";

describe("reportsDateRangeQuerySchema", () => {
  it("accepts a valid date range", () => {
    const result = reportsDateRangeQuerySchema.safeParse({
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T23:59:59.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects when from is not before to", () => {
    const result = reportsDateRangeQuerySchema.safeParse({
      from: "2026-07-31T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid ISO datetimes", () => {
    const result = reportsDateRangeQuerySchema.safeParse({
      from: "not-a-date",
      to: "2026-07-31T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
