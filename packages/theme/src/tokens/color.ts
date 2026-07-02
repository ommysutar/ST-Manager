/**
 * Raw color palette — full 50–950 scales. This is the single place actual
 * hex values are chosen; semantic meaning (background, primary,
 * destructive, ...) is assigned exclusively in `src/themes/*`, which alias
 * into these scales rather than repeating hex literals. Never import this
 * file from a component — components consume semantic CSS variables
 * (`bg-primary`, `text-muted-foreground`, ...) generated from
 * `src/themes/*`, not this palette directly.
 */
export const neutral = {
  50: "#fafafa",
  100: "#f4f4f5",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#a1a1aa",
  500: "#71717a",
  600: "#52525b",
  700: "#3f3f46",
  800: "#27272a",
  900: "#18181b",
  950: "#09090b",
} as const;

export const brand = {
  50: "#eef2ff",
  100: "#e0e7ff",
  200: "#c7d2fe",
  300: "#a5b4fc",
  400: "#818cf8",
  500: "#6366f1",
  600: "#4f46e5",
  700: "#4338ca",
  800: "#3730a3",
  900: "#312e81",
  950: "#1e1b4b",
} as const;

export const destructive = {
  50: "#fef2f2",
  500: "#ef4444",
  600: "#dc2626",
  700: "#b91c1c",
} as const;

export const white = "#ffffff";
export const black = "#000000";

export const colorTokens = { neutral, brand, destructive, white, black } as const;
