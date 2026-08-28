const PROJECT_OPTIONAL_STRING_FIELDS = [
  "inquiryId",
  "clientId",
  "clientMobile",
  "clientEmail",
  "projectCategory",
  "planId",
  "notes",
] as const;

export type ProjectOptionalStringField = (typeof PROJECT_OPTIONAL_STRING_FIELDS)[number];

/** Prepares project create/update payloads so optional strings are never null on the wire. */
export function serializeProjectRequestBody<T extends Record<string, unknown>>(payload: T): T {
  const next: Record<string, unknown> = { ...payload };

  for (const field of PROJECT_OPTIONAL_STRING_FIELDS) {
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
