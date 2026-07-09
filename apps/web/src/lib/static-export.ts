/** Placeholder segment value used only for Next.js static export builds (Tauri). */
export const STATIC_EXPORT_PLACEHOLDER = "__static__";

export function staticExportParams(
  key: string,
): Array<Record<string, string>> {
  return [{ [key]: STATIC_EXPORT_PLACEHOLDER }];
}
