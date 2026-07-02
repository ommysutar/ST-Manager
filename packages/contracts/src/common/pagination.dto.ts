export interface PaginationMetaDto {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Generic paginated list envelope, reused by every future list endpoint —
 * not just Studio. Kept generic on purpose (decision: "keep
 * PaginatedResponse generic") rather than hand-duplicated per resource. Also
 * carries the standard `success` envelope field (M5 decision: "standardize
 * API responses") alongside its own required `meta`.
 */
export interface PaginatedResponseDto<T> {
  success: true;
  data: T[];
  meta: PaginationMetaDto;
}
