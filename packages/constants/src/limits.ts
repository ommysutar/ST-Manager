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
  /** Max records returned by one clients sync pull. */
  MAX_CLIENTS_PULL_BATCH: 500,
} as const;

/** Studio-user password reset (forgot-password flow). */
export const PASSWORD_RESET = {
  /** Token lifetime from issue time. */
  TOKEN_TTL_MS: 30 * 60 * 1000,
  /** Sliding window for rate-limit counters. */
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  /** Max forgot-password attempts per email hash in the window. */
  MAX_REQUESTS_PER_EMAIL: 5,
  /** Max forgot-password attempts per client IP in the window. */
  MAX_REQUESTS_PER_IP: 20,
} as const;
