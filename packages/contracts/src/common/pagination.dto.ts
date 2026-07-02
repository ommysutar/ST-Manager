export interface PaginationMetaDto {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Generic paginated list envelope, reused by every future list endpoint —
 * not just Studio. Kept generic on purpose (decision: "keep
 * PaginatedResponse generic") rather than hand-duplicated per resource.
 */
export interface PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMetaDto;
}
