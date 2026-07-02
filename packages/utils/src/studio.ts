import type { Studio } from "@st-manager/types";

import { formatIsoDate } from "./date";

/**
 * Converts a Studio name into a URL-safe slug, e.g. for use in API routes
 * or web/desktop navigation (`/studios/:slug`). Consumers should still treat
 * `Studio.id` as the canonical identifier; the slug is for display/routing.
 */
export function slugifyStudioName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Derives up to two uppercase initials from a Studio name, for avatar/badge
 * display in the UI (M6+). Falls back to "?" for an empty/whitespace name.
 */
export function getStudioInitials(studio: Pick<Studio, "name">): string {
  const words = studio.name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

/**
 * Formats a Studio's creation date for display (YYYY-MM-DD).
 */
export function formatStudioCreatedAt(studio: Pick<Studio, "createdAt">): string {
  return formatIsoDate(studio.createdAt);
}
