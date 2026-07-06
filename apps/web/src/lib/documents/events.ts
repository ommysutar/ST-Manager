export const DOCUMENTS_UPDATED_EVENT = "st-manager-documents-updated";

export function notifyDocumentsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DOCUMENTS_UPDATED_EVENT));
  }
}
