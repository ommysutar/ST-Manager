const PROJECT_BOOKING_OPTIONAL_STRING_FIELDS = ["clientId", "engineerId", "sessionId"] as const;

/** Prepares project booking create/update payloads so optional strings are never null on the wire. */
export function serializeProjectBookingRequestBody<T extends Record<string, unknown>>(
  payload: T,
): T {
  const next: Record<string, unknown> = { ...payload };

  for (const field of PROJECT_BOOKING_OPTIONAL_STRING_FIELDS) {
    if (!(field in next)) {
      continue;
    }

    const value = next[field];
    if (value === null || value === undefined) {
      next[field] = "";
    }
  }

  return next as T;
}
