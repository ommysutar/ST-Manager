import { describe, expect, it } from "vitest";

import { formatStudioCreatedAt, getStudioInitials, slugifyStudioName } from "./studio";

describe("slugifyStudioName", () => {
  it("converts a studio name into a URL-safe slug", () => {
    expect(slugifyStudioName("  Downtown Creative Studio! ")).toBe("downtown-creative-studio");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(slugifyStudioName("   ")).toBe("");
  });
});

describe("getStudioInitials", () => {
  it("derives up to two initials from a multi-word name", () => {
    expect(getStudioInitials({ name: "North Star Studio" })).toBe("NS");
  });

  it("falls back to ? for an empty name", () => {
    expect(getStudioInitials({ name: "   " })).toBe("?");
  });
});

describe("formatStudioCreatedAt", () => {
  it("formats a studio creation date as YYYY-MM-DD", () => {
    expect(formatStudioCreatedAt({ createdAt: new Date("2026-07-03T12:34:56.000Z") })).toBe(
      "2026-07-03",
    );
  });
});
