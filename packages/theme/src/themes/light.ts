import { brand, destructive, neutral, white } from "../tokens/color";

/**
 * Semantic color roles for the light theme. Names deliberately match
 * shadcn/ui's own CSS variable convention (`background`, `primary`,
 * `mutedForeground`, ...) so every shadcn-sourced component in
 * `packages/ui` works against these tokens with zero renaming/mapping
 * layer. Every value aliases into `tokens/color.ts` — no hex literal is
 * ever repeated here.
 */
export const lightTheme = {
  background: white,
  foreground: neutral[950],
  card: white,
  cardForeground: neutral[950],
  popover: white,
  popoverForeground: neutral[950],
  primary: brand[600],
  primaryForeground: white,
  secondary: neutral[100],
  secondaryForeground: neutral[900],
  muted: neutral[100],
  mutedForeground: neutral[500],
  accent: neutral[100],
  accentForeground: neutral[900],
  destructive: destructive[600],
  destructiveForeground: white,
  border: neutral[200],
  input: neutral[200],
  ring: brand[600],
} as const;

export type SemanticTheme = Record<keyof typeof lightTheme, string>;
