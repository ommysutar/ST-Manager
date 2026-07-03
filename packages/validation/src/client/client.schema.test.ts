import { PAGINATION } from "@st-manager/constants";
import { describe, expect, it } from "vitest";

import { createClientSchema, updateClientSchema } from "./client.schema";
import { listClientsQuerySchema } from "./list-clients-query.schema";

describe("createClientSchema", () => {
  it("requires a trimmed client name", () => {
    expect(createClientSchema.parse({ name: "  Acme Records  " })).toEqual({
      name: "Acme Records",
      email: null,
      phone: null,
      company: null,
      notes: null,
    });
  });

  it("rejects empty names", () => {
    const result = createClientSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("accepts optional contact fields and normalizes empty strings to null", () => {
    expect(
      createClientSchema.parse({
        name: "Jane Client",
        email: "",
        phone: "555-0100",
        company: "Acme",
        notes: "VIP",
      }),
    ).toEqual({
      name: "Jane Client",
      email: null,
      phone: "555-0100",
      company: "Acme",
      notes: "VIP",
    });
  });
});

describe("updateClientSchema", () => {
  it("requires at least one field", () => {
    const result = updateClientSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts partial updates", () => {
    expect(updateClientSchema.parse({ name: "Updated Client" })).toEqual({
      name: "Updated Client",
    });
  });
});

describe("listClientsQuerySchema", () => {
  it("applies pagination defaults", () => {
    expect(listClientsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    });
  });

  it("accepts optional search", () => {
    expect(listClientsQuerySchema.parse({ search: "acme" })).toEqual({
      page: 1,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      search: "acme",
    });
  });

  it("rejects pageSize above the maximum", () => {
    const result = listClientsQuerySchema.safeParse({ pageSize: PAGINATION.MAX_PAGE_SIZE + 1 });
    expect(result.success).toBe(false);
  });
});
