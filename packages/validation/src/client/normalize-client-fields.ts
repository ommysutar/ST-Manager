const CLIENT_OPTIONAL_STRING_FIELDS = ["email", "phone", "whatsappNumber", "company", "notes"] as const;

export type ClientOptionalStringField = (typeof CLIENT_OPTIONAL_STRING_FIELDS)[number];

/** Normalizes nullable form/API input to a trimmed string (never null). */
export function normalizeOptionalApiString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return value.trim();
}

/** Prepares client create/update payloads so optional strings are never null on the wire. */
export function serializeClientRequestBody<T extends Record<string, unknown>>(payload: T): T {
  const next: Record<string, unknown> = { ...payload };

  for (const field of CLIENT_OPTIONAL_STRING_FIELDS) {
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
