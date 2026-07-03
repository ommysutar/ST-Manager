import { PAGINATION } from "@st-manager/constants";
import { describe, expect, it } from "vitest";

import { createStudioSchema } from "./studio.schema";
import { listStudiosQuerySchema } from "./list-studios-query.schema";

describe("createStudioSchema", () => {
  it("accepts a valid studio name", () => {
    expect(createStudioSchema.parse({ name: " Downtown Studio " })).toEqual({
      name: "Downtown Studio",
    });
  });

  it("rejects an empty name", () => {
    const result = createStudioSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects names longer than 120 characters", () => {
    const result = createStudioSchema.safeParse({ name: "a".repeat(121) });
    expect(result.success).toBe(false);
  });
});

describe("listStudiosQuerySchema", () => {
  it("applies pagination defaults", () => {
    expect(listStudiosQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    });
  });

  it("coerces string query parameters", () => {
    expect(listStudiosQuerySchema.parse({ page: "2", pageSize: "5" })).toEqual({
      page: 2,
      pageSize: 5,
    });
  });

  it("rejects pageSize above the shared maximum", () => {
    const result = listStudiosQuerySchema.safeParse({ pageSize: PAGINATION.MAX_PAGE_SIZE + 1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive page numbers", () => {
    const result = listStudiosQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });
});
