/**
 * Formats a Date as an ISO 8601 date string (YYYY-MM-DD), independent of the
 * host machine's locale. Internal support helper — prefer the Studio-specific
 * helpers in ./studio for consumer-facing formatting.
 */
export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
