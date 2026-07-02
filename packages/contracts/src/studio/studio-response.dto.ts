import type { Studio } from "@st-manager/types";

/**
 * Response shape for a single Studio, as it actually crosses the wire.
 *
 * Deliberately **not** `Studio` itself: `Studio.createdAt`/`updatedAt` are
 * `Date` objects in `packages/types` and in the Prisma-generated client, but
 * every HTTP response body is JSON, and `JSON.stringify` always turns a
 * `Date` into an ISO 8601 string. Any type that claims a response field is
 * `Date` is describing something that never actually arrives over HTTP.
 */
export interface StudioResponseDto extends Omit<Studio, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}
