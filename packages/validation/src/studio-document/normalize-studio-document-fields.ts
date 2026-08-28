const STUDIO_DOCUMENT_OPTIONAL_STRING_FIELDS = [
  "inquiryId",
  "projectId",
  "paymentId",
] as const;

export type StudioDocumentOptionalStringField =
  (typeof STUDIO_DOCUMENT_OPTIONAL_STRING_FIELDS)[number];

/** Prepares studio document create/update payloads so optional strings are never null on the wire. */
export function serializeStudioDocumentRequestBody<T extends Record<string, unknown>>(
  payload: T,
): T {
  const next: Record<string, unknown> = { ...payload };

  for (const field of STUDIO_DOCUMENT_OPTIONAL_STRING_FIELDS) {
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
