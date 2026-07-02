/**
 * Semantic layout constants — deliberately NOT a general spacing/utility
 * scale (Tailwind's default spacing scale already covers `p-4`, `gap-2`,
 * etc. without duplication). These are named, product-specific
 * measurements reused at a handful of fixed layout positions across apps
 * (e.g. a persistent sidebar), so they live here instead of being
 * hand-typed at each call site.
 */
export const layout = {
  sidebarWidth: "16rem",
  headerHeight: "3.5rem",
  contentMaxWidth: "72rem",
} as const;
