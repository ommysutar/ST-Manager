import { describe, expect, it } from "vitest";

import { serializeClientRequestBody } from "./normalize-client-fields";

describe("serializeClientRequestBody", () => {
  it("converts null optional client fields to empty strings", () => {
    expect(
      serializeClientRequestBody({
        name: "Jane Client",
        email: null,
        phone: null,
        company: null,
        notes: null,
      }),
    ).toEqual({
      name: "Jane Client",
      email: "",
      phone: "",
      company: "",
      notes: "",
    });
  });
});
