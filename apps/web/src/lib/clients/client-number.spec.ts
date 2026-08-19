import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/token-store", () => ({
  getAuthUserSnapshot: () => ({
    id: "user-1",
    email: "owner@studio.test",
    role: "owner",
    studioId: "studio-a",
  }),
}));

import {
  getClientDisplayNumber,
  remapClientDisplayNumber,
  rememberClientDisplayNumber,
} from "./client-number";

describe("client display number registry", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("prefers server-backed displayNumber and remembers it", () => {
    expect(getClientDisplayNumber("cli_1", "CL-0004")).toBe("CL-0004");
    expect(getClientDisplayNumber("cli_1")).toBe("CL-0004");
  });

  it("does not invent numbers for server ids without a server value", () => {
    expect(getClientDisplayNumber("cli_server_only")).toBe("");
  });

  it("allocates provisional numbers only for offline local ids", () => {
    const first = getClientDisplayNumber("local_cli_aaa");
    const second = getClientDisplayNumber("local_cli_bbb");
    expect(first).toMatch(/^CL-\d{4}$/);
    expect(second).toMatch(/^CL-\d{4}$/);
    expect(first).not.toBe(second);
  });

  it("remaps local provisional number onto the server id once", () => {
    const provisional = getClientDisplayNumber("local_cli_remap");
    remapClientDisplayNumber("local_cli_remap", "server_cli_remap");
    expect(getClientDisplayNumber("server_cli_remap")).toBe(provisional);
    // Local id entry is removed; server id keeps the stable number.
    rememberClientDisplayNumber("server_cli_remap", provisional);
    expect(getClientDisplayNumber("server_cli_remap", provisional)).toBe(provisional);
  });

  it("rememberClientDisplayNumber is idempotent", () => {
    rememberClientDisplayNumber("cli_x", "CL-0009");
    rememberClientDisplayNumber("cli_x", "CL-0009");
    expect(getClientDisplayNumber("cli_x")).toBe("CL-0009");
  });
});
