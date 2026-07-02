import { brand, destructive, neutral, white } from "../tokens/color";
import type { SemanticTheme } from "./light";

/**
 * Dark variant of the same semantic roles as `light.ts`. Kept as a
 * complete, type-checked mirror (`SemanticTheme` enforces every key from
 * the light theme is also present here) so the two themes can never drift
 * out of sync in shape, only in value.
 */
export const darkTheme: SemanticTheme = {
  background: neutral[950],
  foreground: neutral[50],
  card: neutral[900],
  cardForeground: neutral[50],
  popover: neutral[900],
  popoverForeground: neutral[50],
  primary: brand[500],
  primaryForeground: white,
  secondary: neutral[800],
  secondaryForeground: neutral[50],
  muted: neutral[800],
  mutedForeground: neutral[400],
  accent: neutral[800],
  accentForeground: neutral[50],
  destructive: destructive[500],
  destructiveForeground: white,
  border: neutral[800],
  input: neutral[800],
  ring: brand[500],
};
