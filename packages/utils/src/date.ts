/**
 * Formats a Date as an ISO 8601 date string (YYYY-MM-DD), independent of the
 * host machine's locale. Framework-agnostic — no runtime dependencies.
 */
export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
