import { formatINR } from "@/lib/currency";
import { getInquiry } from "@/lib/inquiry/storage";
import { getProjectReceivedTotal, listPaymentsByProject } from "@/lib/payments/storage";
import type { PaymentRecord } from "@/lib/payments/types";
import type { StudioProfile } from "@/lib/profile/types";
import { getProject } from "@/lib/projects/storage";

import type { DocumentType, StudioDocument } from "./types";

export interface DocumentLineItemVM {
  id: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface DocumentViewModel {
  type: DocumentType;
  documentNumber: string;
  date: string;
  studio: {
    logoDataUrl: string;
    studioName: string;
    address: string;
    mobile: string;
    email: string;
    website: string;
    gstNumber: string;
    bankDetails: StudioProfile["bankDetails"];
    upiId: string;
    upiQrDataUrl: string;
    signatureDataUrl: string;
    footerText: string;
    termsAndConditions: string;
    thankYouMessage: string;
  };
  client: {
    name: string;
    mobile: string;
    email: string;
    address: string;
  };
  project: {
    projectNumber: string;
    projectName: string;
    category: string;
  };
  lineItems: DocumentLineItemVM[];
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  paymentSummary?: {
    received: number;
    remaining: number;
    history: PaymentRecord[];
  };
}

const EMPTY_STUDIO: DocumentViewModel["studio"] = {
  logoDataUrl: "",
  studioName: "Studio Name",
  address: "",
  mobile: "",
  email: "",
  website: "",
  gstNumber: "",
  bankDetails: { accountName: "", accountNumber: "", ifsc: "", bankName: "" },
  upiId: "",
  upiQrDataUrl: "",
  signatureDataUrl: "",
  footerText: "",
  termsAndConditions: "",
  thankYouMessage: "",
};

interface ResolvedSource {
  clientName: string;
  clientMobile: string;
  clientEmail: string;
  clientAddress: string;
  projectNumber: string;
  projectName: string;
  category: string;
  lineItems: DocumentLineItemVM[];
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
}

function resolveFromProject(projectId: string): ResolvedSource | null {
  const project = getProject(projectId);
  if (!project?.quotation) {
    return null;
  }

  return {
    clientName: project.clientName,
    clientMobile: project.clientMobile ?? "",
    clientEmail: project.clientEmail ?? "",
    clientAddress: "",
    projectNumber: project.projectNumber,
    projectName: project.projectName,
    category: project.projectCategory ?? "",
    ...flattenQuotation(project.quotation),
  };
}

function resolveFromInquiry(inquiryId: string): ResolvedSource | null {
  const inquiry = getInquiry(inquiryId);
  if (!inquiry) {
    return null;
  }

  return {
    clientName: inquiry.form.clientName,
    clientMobile: inquiry.form.mobileNumber,
    clientEmail: inquiry.form.email,
    clientAddress: inquiry.form.address,
    projectNumber: inquiry.inquiryNumber,
    projectName: inquiry.form.projectName,
    category: inquiry.form.projectCategory,
    ...flattenQuotation(inquiry.quotation),
  };
}

export function buildDocumentViewModel(
  document: StudioDocument,
  profile: StudioProfile | null,
): DocumentViewModel | null {
  const resolved = document.projectId
    ? resolveFromProject(document.projectId)
    : document.inquiryId
      ? resolveFromInquiry(document.inquiryId)
      : null;

  if (!resolved) {
    return null;
  }

  const { clientName, clientMobile, clientEmail, clientAddress, projectNumber, projectName, category, lineItems, subtotal, discountAmount, grandTotal } =
    resolved;

  const paymentSummary: DocumentViewModel["paymentSummary"] =
    document.type === "invoice" && document.projectId
      ? {
          received: getProjectReceivedTotal(document.projectId),
          remaining: Math.max(0, grandTotal - getProjectReceivedTotal(document.projectId)),
          history: listPaymentsByProject(document.projectId),
        }
      : undefined;

  return {
    type: document.type,
    documentNumber: document.documentNumber,
    date: document.createdAt,
    studio: profile
      ? {
          logoDataUrl: profile.logoDataUrl,
          studioName: profile.studioName || EMPTY_STUDIO.studioName,
          address: profile.address,
          mobile: profile.mobile,
          email: profile.email,
          website: profile.website,
          gstNumber: profile.gstNumber,
          bankDetails: profile.bankDetails,
          upiId: profile.upiId,
          upiQrDataUrl: profile.upiQrDataUrl,
          signatureDataUrl: profile.signatureDataUrl,
          footerText: profile.footerText,
          termsAndConditions: profile.termsAndConditions,
          thankYouMessage: profile.thankYouMessage,
        }
      : EMPTY_STUDIO,
    client: { name: clientName, mobile: clientMobile, email: clientEmail, address: clientAddress },
    project: { projectNumber, projectName, category },
    lineItems,
    subtotal,
    discountAmount,
    grandTotal,
    paymentSummary,
  };
}

function flattenQuotation(quotation: {
  serviceLines: { id: string; name: string; price: number }[];
  customServiceLines: { id: string; name: string; price: number }[];
  studioRentHours: number;
  studioRentRate: number;
  studioRentAmount: number;
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
}): { lineItems: DocumentLineItemVM[]; subtotal: number; discountAmount: number; grandTotal: number } {
  const lineItems: DocumentLineItemVM[] = [
    ...quotation.serviceLines.map((line) => ({
      id: line.id,
      name: line.name,
      quantity: 1,
      price: line.price,
      amount: line.price,
    })),
    ...quotation.customServiceLines.map((line) => ({
      id: line.id,
      name: line.name,
      quantity: 1,
      price: line.price,
      amount: line.price,
    })),
  ];

  if (quotation.studioRentAmount > 0) {
    lineItems.push({
      id: "studio-rent",
      name: `Studio Rent (${quotation.studioRentHours}h × ${formatINR(quotation.studioRentRate)})`,
      quantity: quotation.studioRentHours,
      price: quotation.studioRentRate,
      amount: quotation.studioRentAmount,
    });
  }

  return {
    lineItems,
    subtotal: quotation.subtotal,
    discountAmount: quotation.discountAmount,
    grandTotal: quotation.grandTotal,
  };
}
