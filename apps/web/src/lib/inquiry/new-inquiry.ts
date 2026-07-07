import { clearWizardDraft } from "@/lib/inquiry/storage";

/** Unique session id so each New Inquiry opens a remounted, empty wizard. */
export function createNewInquirySessionId(): string {
  return String(Date.now());
}

export function buildNewInquiryHref(sessionId: string = createNewInquirySessionId()): string {
  return `/inquiries/new?session=${encodeURIComponent(sessionId)}`;
}

export function prepareNewInquirySession(): string {
  clearWizardDraft();
  return createNewInquirySessionId();
}

export function navigateToNewInquiry(
  navigate: (href: string) => void,
  sessionId: string = prepareNewInquirySession(),
): void {
  navigate(buildNewInquiryHref(sessionId));
}
