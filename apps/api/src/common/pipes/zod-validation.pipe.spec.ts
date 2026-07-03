import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ZodValidationPipe } from "./zod-validation.pipe";

describe("ZodValidationPipe", () => {
  it("returns parsed values including defaults", () => {
    const pipe = new ZodValidationPipe(
      z.object({
        page: z.coerce.number().int().positive().default(1),
      }),
    );

    expect(pipe.transform({})).toEqual({ page: 1 });
  });

  it("throws BadRequestException with structured details on failure", () => {
    const pipe = new ZodValidationPipe(z.object({ name: z.string().min(1) }));

    try {
      pipe.transform({ name: "" });
      expect.fail("Expected BadRequestException");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message: string;
        details: Array<{ path: string; message: string }>;
      };
      expect(response.message).toBe("Validation failed");
      expect(response.details[0]?.path).toBe("name");
    }
  });
});
