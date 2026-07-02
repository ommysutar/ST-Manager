/**
 * Standard successful-response envelope (M5 decision: "standardize API
 * responses"). Every 2xx `apps/api` response body is either this shape or
 * `PaginatedResponseDto<T>` (the paginated variant, which additionally
 * carries `meta`) — never a bare resource object.
 */
export interface ApiSuccessResponseDto<T> {
  success: true;
  data: T;
}
