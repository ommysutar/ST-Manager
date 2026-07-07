import { getInquiry } from "@/lib/inquiry/storage";
import { getProjectReceivedTotal, listPaymentsByProject } from "@/lib/payments/storage";
import type { PaymentRecord } from "@/lib/payments/types";
import type { StudioProfile } from "@/lib/profile/types";
import { getProject } from "@/lib/projects/storage";

import type { DocumentSnapshot, DocumentType, StudioDocument } from "./types";

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
    id: string;
    name: string;
    mobile: string;
    email: string;
    address: string;
  };
  project: {
    id: string;
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
  receipt?: {
    amount: number;
    method: string;
    date: string;
    notes: string;
    receivedBy: string;
  };
}

function studioFromProfile(profile: StudioProfile | null): DocumentViewModel["studio"] {
  if (!profile?.studioName?.trim()) {
    return {
      logoDataUrl: profile?.logoDataUrl ?? "",
      studioName: "",
      address: profile?.address ?? "",
      mobile: profile?.mobile ?? "",
      email: profile?.email ?? "",
      website: profile?.website ?? "",
      gstNumber: profile?.gstNumber ?? "",
      bankDetails: profile?.bankDetails ?? {
        accountName: "",
        accountNumber: "",
        ifsc: "",
        bankName: "",
      },
      upiId: profile?.upiId ?? "",
      upiQrDataUrl: profile?.upiQrDataUrl ?? "",
      signatureDataUrl: profile?.signatureDataUrl ?? "",
      footerText: profile?.footerText ?? "",
      termsAndConditions: profile?.termsAndConditions ?? "",
      thankYouMessage: profile?.thankYouMessage ?? "",
    };
  }

  return {
    logoDataUrl: profile.logoDataUrl,
    studioName: profile.studioName,
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
  };
}

function viewModelFromSnapshot(
  document: StudioDocument,
  snapshot: DocumentSnapshot,
  profile: StudioProfile | null,
): DocumentViewModel {
  const paymentSummary: DocumentViewModel["paymentSummary"] =
    document.type === "invoice" && document.projectId
      ? {
          received: getProjectReceivedTotal(document.projectId),
          remaining: Math.max(0, snapshot.grandTotal - getProjectReceivedTotal(document.projectId)),
          history: listPaymentsByProject(document.projectId),
        }
      : undefined;

  const receipt =
    document.type === "receipt" && snapshot.paymentAmount !== undefined
      ? {
          amount: snapshot.paymentAmount,
          method: snapshot.paymentMethod ?? "",
          date: snapshot.paymentDate ?? document.createdAt,
          notes: snapshot.paymentNotes ?? "",
          receivedBy: snapshot.paymentReceivedBy ?? "",
        }
      : undefined;

  return {
    type: document.type,
    documentNumber: document.documentNumber,
    date: document.createdAt,
    studio: studioFromProfile(profile),
    client: {
      id: snapshot.clientDisplayNumber,
      name: snapshot.clientName,
      mobile: snapshot.clientMobile,
      email: snapshot.clientEmail,
      address: snapshot.clientAddress,
    },
    project: {
      id: snapshot.projectNumber,
      projectNumber: snapshot.projectNumber,
      projectName: snapshot.projectName,
      category: snapshot.projectCategory,
    },
    lineItems: snapshot.lineItems,
    subtotal: snapshot.subtotal,
    discountAmount: snapshot.discountAmount,
    grandTotal: snapshot.grandTotal,
    paymentSummary,
    receipt,
  };
}

function resolveLiveSnapshot(document: StudioDocument): DocumentSnapshot | null {
  if (document.projectId) {
    const project = getProject(document.projectId);
    if (!project?.quotation && document.type !== "receipt") {
      return null;
    }

    if (project) {
      return {
        clientId: project.clientId ?? "",
        clientDisplayNumber: "",
        clientName: project.clientName,
        clientMobile: project.clientMobile ?? "",
        clientEmail: project.clientEmail ?? "",
        clientAddress: "",
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        projectCategory: project.projectCategory ?? "",
        lineItems: [],
        subtotal: project.grandTotal,
        discountAmount: 0,
        grandTotal: project.grandTotal,
        capturedAt: document.createdAt,
      };
    }
  }

  if (document.inquiryId) {
    const inquiry = getInquiry(document.inquiryId);
    if (!inquiry) {
      return null;
    }

    return {
      clientId: inquiry.form.existingClientId ?? "",
      clientDisplayNumber: "",
      clientName: inquiry.form.clientName,
      clientMobile: inquiry.form.mobileNumber,
      clientEmail: inquiry.form.email,
      clientAddress: inquiry.form.address,
      projectId: inquiry.projectId ?? "",
      projectNumber: inquiry.inquiryNumber,
      projectName: inquiry.form.projectName,
      projectCategory: inquiry.form.projectCategory,
      lineItems: [],
      subtotal: inquiry.quotation.grandTotal,
      discountAmount: inquiry.quotation.discountAmount,
      grandTotal: inquiry.quotation.grandTotal,
      capturedAt: document.createdAt,
    };
  }

  return null;
}

export function buildDocumentViewModel(
  document: StudioDocument,
  profile: StudioProfile | null,
): DocumentViewModel | null {
  if (document.snapshot) {
    return viewModelFromSnapshot(document, document.snapshot, profile);
  }

  const live = resolveLiveSnapshot(document);
  if (!live) {
    return null;
  }

  return viewModelFromSnapshot(document, live, profile);
}
