/**
 * Font family tokens only. Font size/weight/line-height are deliberately
 * NOT redefined here — Tailwind's default type scale already covers those
 * without duplication; only the actual typeface choice is
 * product-specific and worth centralizing.
 */
export const fontFamily = {
  sans: [
    "Inter",
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ].join(", "),
  mono: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Consolas",
    '"Liberation Mono"',
    '"Courier New"',
    "monospace",
  ].join(", "),
} as const;
