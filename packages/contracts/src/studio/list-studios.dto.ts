import type { PaginatedResponseDto } from "../common/pagination.dto";
import type { StudioResponseDto } from "./studio-response.dto";

/**
 * Query parameters for `GET /studios`. Both optional — server (M5) and SDK
 * (M4) both apply `packages/constants`' `PAGINATION` defaults when omitted.
 * Arrives over the wire as query-string values (i.e. strings), so
 * `packages/validation`'s corresponding schema must coerce these to
 * numbers — this type describes the *logical* shape, not the raw wire
 * encoding.
 */
export interface ListStudiosQueryDto {
  page?: number;
  pageSize?: number;
}

export type ListStudiosResponseDto = PaginatedResponseDto<StudioResponseDto>;
