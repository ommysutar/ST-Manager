const INQUIRY_OPTIONAL_STRING_FIELDS = ["projectId"] as const;

export type InquiryOptionalStringField = (typeof INQUIRY_OPTIONAL_STRING_FIELDS)[number];

/** Prepares inquiry create/update payloads so optional strings are never null on the wire. */
export function serializeInquiryRequestBody<T extends Record<string, unknown>>(payload: T): T {
  const next: Record<string, unknown> = { ...payload };

  for (const field of INQUIRY_OPTIONAL_STRING_FIELDS) {
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
