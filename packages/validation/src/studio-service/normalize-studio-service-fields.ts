const STUDIO_SERVICE_OPTIONAL_STRING_FIELDS = [] as const;

/** Prepares studio service create/update payloads for the wire. */
export function serializeStudioServiceRequestBody<T extends Record<string, unknown>>(payload: T): T {
  const next: Record<string, unknown> = { ...payload };

  for (const field of STUDIO_SERVICE_OPTIONAL_STRING_FIELDS) {
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
