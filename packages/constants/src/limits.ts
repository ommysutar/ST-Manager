/**
 * Shared pagination and size limits used across API and clients.
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const SYNC = {
  MAX_PUSH_BATCH: 50,
  MAX_PULL_BATCH: 500,
} as const;
