import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/**
 * Generic Nest pipe backed by a Zod schema, instantiated per-parameter
 * (`@Body(new ZodValidationPipe(schema))` / `@Query(...)`) rather than
 * registered globally — each endpoint/parameter needs a different schema,
 * and Zod (unlike `class-validator`) has no per-DTO-class decorator
 * metadata for Nest to discover automatically.
 *
 * On success, returns the parsed value — for query schemas this includes
 * Zod's coercion/defaulting (e.g. `?page=2` string -> `2` number, missing
 * `pageSize` -> its default), so controllers receive fully-resolved values.
 *
 * On failure, throws `BadRequestException` with a `{ message, details }`
 * body that `HttpExceptionFilter` (M5) recognizes and folds into the
 * standard `ApiErrorResponseDto` shape.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: "Validation failed",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    return result.data;
  }
}
