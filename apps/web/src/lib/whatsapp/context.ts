import type { StudioDocument } from "@/lib/documents/types";
import type { SavedInquiry } from "@/lib/inquiry/types";
import type { ProjectBooking } from "@/lib/bookings/types";
import type { StudioProject } from "@/lib/projects/types";
import type { StudioProfile } from "@/lib/profile/types";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/constants";
import { formatINR } from "@/lib/currency";

import type { WhatsAppMessageVariables } from "./types";

export function buildProjectWhatsAppVariables(
  project: StudioProject,
  profile: StudioProfile | null,
  extras?: Partial<WhatsAppMessageVariables>,
): WhatsAppMessageVariables {
  return {
    ClientName: project.clientName,
    ProjectName: project.projectName,
    ProjectID: project.projectNumber,
    StudioName: profile?.studioName || profile?.fullName || "",
    ProjectStatus: PROJECT_STATUS_LABELS[project.status] ?? project.status,
    BalanceAmount: formatINR(project.remainingBalance),
    PaymentAmount: formatINR(Math.max(0, project.grandTotal - project.remainingBalance)),
    ...extras,
  };
}

export function buildInquiryWhatsAppVariables(
  inquiry: SavedInquiry,
  profile: StudioProfile | null,
  extras?: Partial<WhatsAppMessageVariables>,
): WhatsAppMessageVariables {
  return {
    ClientName: inquiry.form.clientName,
    ProjectName: inquiry.form.projectName,
    ProjectID: inquiry.id.slice(-6).toUpperCase(),
    StudioName: profile?.studioName || profile?.fullName || "",
    BalanceAmount: formatINR(inquiry.remainingBalance ?? 0),
    PaymentAmount: formatINR(inquiry.advanceAmount ?? 0),
    ...extras,
  };
}

export function buildBookingWhatsAppVariables(
  project: StudioProject,
  booking: ProjectBooking,
  profile: StudioProfile | null,
): WhatsAppMessageVariables {
  const bookingDate = new Date(`${booking.date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return buildProjectWhatsAppVariables(project, profile, { BookingDate: bookingDate });
}

export function buildDocumentWhatsAppVariables(
  project: StudioProject,
  document: StudioDocument,
  profile: StudioProfile | null,
): WhatsAppMessageVariables {
  return buildProjectWhatsAppVariables(project, profile, {
    InvoiceNumber: document.type === "invoice" ? document.documentNumber : undefined,
    QuotationNumber: document.type === "quotation" ? document.documentNumber : undefined,
  });
}
