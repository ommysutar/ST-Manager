const STUDIO_ROOM_OPTIONAL_STRING_FIELDS = ["roomName"] as const;

/** Prepares studio room create/update payloads so optional strings are never null on the wire. */
export function serializeStudioRoomRequestBody<T extends Record<string, unknown>>(payload: T): T {
  const next: Record<string, unknown> = { ...payload };

  for (const field of STUDIO_ROOM_OPTIONAL_STRING_FIELDS) {
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
