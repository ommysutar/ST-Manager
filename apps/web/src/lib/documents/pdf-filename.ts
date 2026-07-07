import type { DocumentType } from "./types";

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export function sanitizeFilenameSegment(value: string): string {
  return value
    .trim()
    .replace(INVALID_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDocumentPdfFilename(
  projectName: string,
  type: Extract<DocumentType, "quotation" | "invoice">,
): string {
  const safeName = sanitizeFilenameSegment(projectName) || "Document";
  const label = type === "invoice" ? "Invoice" : "Quotation";
  return `${safeName} - ${label}.pdf`;
}

/** Sets document title for browser PDF save, then restores it after printing. */
export function printDocumentPdf(
  projectName: string,
  type: Extract<DocumentType, "quotation" | "invoice">,
): void {
  const previousTitle = document.title;
  document.title = buildDocumentPdfFilename(projectName, type);

  const restoreTitle = () => {
    document.title = previousTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };

  window.addEventListener("afterprint", restoreTitle);
  window.print();
}
