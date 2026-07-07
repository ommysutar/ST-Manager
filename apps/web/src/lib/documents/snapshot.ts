import { getClientDisplayNumber } from "@/lib/clients/client-number";
import { formatINR } from "@/lib/currency";
import { getInquiry } from "@/lib/inquiry/storage";
import type { QuotationBreakdown } from "@/lib/inquiry/types";
import { getPayment } from "@/lib/payments/storage";
import { getProject } from "@/lib/projects/storage";
import type { StudioProject } from "@/lib/projects/types";

import type { DocumentLineItemSnapshot, DocumentSnapshot } from "./types";

function flattenQuotation(quotation: QuotationBreakdown): {
  lineItems: DocumentLineItemSnapshot[];
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
} {
  const lineItems: DocumentLineItemSnapshot[] = [
    ...quotation.serviceLines.map((line) => ({
      id: line.id,
      name:
        line.hours != null && line.hours > 0 && line.hourlyRate != null
          ? `${line.name} (${line.hours}h × ${formatINR(line.hourlyRate)})`
          : line.name,
      quantity: line.hours != null && line.hours > 0 ? line.hours : 1,
      price: line.hourlyRate ?? line.price,
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

  return {
    lineItems,
    subtotal: quotation.subtotal,
    discountAmount: quotation.discountAmount,
    grandTotal: quotation.grandTotal,
  };
}

function snapshotFromProject(project: StudioProject): DocumentSnapshot | null {
  if (!project.quotation) {
    return null;
  }

  const clientId = project.clientId ?? "";
  const totals = flattenQuotation(project.quotation);

  return {
    clientId,
    clientDisplayNumber: getClientDisplayNumber(clientId || undefined),
    clientName: project.clientName,
    clientMobile: project.clientMobile ?? "",
    clientEmail: project.clientEmail ?? "",
    clientAddress: "",
    projectId: project.id,
    projectNumber: project.projectNumber,
    projectName: project.projectName,
    projectCategory: project.projectCategory ?? "",
    ...totals,
    capturedAt: new Date().toISOString(),
  };
}

function snapshotFromInquiry(inquiryId: string): DocumentSnapshot | null {
  const inquiry = getInquiry(inquiryId);
  if (!inquiry) {
    return null;
  }

  const clientId = inquiry.form.existingClientId?.trim() ?? "";
  const totals = flattenQuotation(inquiry.quotation);
  const linkedProject = inquiry.projectId ? getProject(inquiry.projectId) : undefined;

  return {
    clientId,
    clientDisplayNumber: getClientDisplayNumber(clientId || undefined),
    clientName: inquiry.form.clientName,
    clientMobile: inquiry.form.mobileNumber,
    clientEmail: inquiry.form.email,
    clientAddress: inquiry.form.address,
    projectId: linkedProject?.id ?? inquiry.projectId ?? "",
    projectNumber: linkedProject?.projectNumber ?? inquiry.inquiryNumber,
    projectName: linkedProject?.projectName ?? inquiry.form.projectName,
    projectCategory: linkedProject?.projectCategory ?? inquiry.form.projectCategory,
    ...totals,
    capturedAt: new Date().toISOString(),
  };
}

export function buildDocumentSnapshot(input: {
  projectId?: string;
  inquiryId?: string;
  paymentId?: string;
}): DocumentSnapshot | null {
  if (input.paymentId) {
    return buildReceiptSnapshot(input.paymentId, input.projectId);
  }

  if (input.projectId) {
    const project = getProject(input.projectId);
    if (project) {
      return snapshotFromProject(project);
    }
  }

  if (input.inquiryId) {
    return snapshotFromInquiry(input.inquiryId);
  }

  return null;
}

function buildReceiptSnapshot(paymentId: string, projectId?: string): DocumentSnapshot | null {
  const payment = getPayment(paymentId);
  if (!payment) {
    return null;
  }

  const project = getProject(projectId ?? payment.projectId);
  if (!project) {
    return null;
  }

  const base = snapshotFromProject(project);
  if (!base) {
    const clientId = project.clientId ?? "";
    return {
      clientId,
      clientDisplayNumber: getClientDisplayNumber(clientId || undefined),
      clientName: project.clientName,
      clientMobile: project.clientMobile ?? "",
      clientEmail: project.clientEmail ?? "",
      clientAddress: "",
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      projectCategory: project.projectCategory ?? "",
      lineItems: [],
      subtotal: payment.amount,
      discountAmount: 0,
      grandTotal: payment.amount,
      paymentId: payment.id,
      paymentAmount: payment.amount,
      paymentMethod: payment.method,
      paymentDate: payment.createdAt,
      paymentNotes: payment.notes,
      paymentReceivedBy: payment.receivedBy,
      capturedAt: new Date().toISOString(),
    };
  }

  return {
    ...base,
    lineItems: [
      {
        id: payment.id,
        name: "Payment Received",
        quantity: 1,
        price: payment.amount,
        amount: payment.amount,
      },
    ],
    subtotal: payment.amount,
    discountAmount: 0,
    grandTotal: payment.amount,
    paymentId: payment.id,
    paymentAmount: payment.amount,
    paymentMethod: payment.method,
    paymentDate: payment.createdAt,
    paymentNotes: payment.notes,
    paymentReceivedBy: payment.receivedBy,
    capturedAt: new Date().toISOString(),
  };
}

export function mergeProjectIntoSnapshot(
  snapshot: DocumentSnapshot,
  project: StudioProject,
): DocumentSnapshot {
  const clientId = project.clientId ?? snapshot.clientId;

  return {
    ...snapshot,
    clientId,
    clientDisplayNumber: getClientDisplayNumber(clientId || undefined) || snapshot.clientDisplayNumber,
    clientName: project.clientName || snapshot.clientName,
    clientMobile: project.clientMobile ?? snapshot.clientMobile,
    clientEmail: project.clientEmail ?? snapshot.clientEmail,
    projectId: project.id,
    projectNumber: project.projectNumber,
    projectName: project.projectName,
    projectCategory: project.projectCategory ?? snapshot.projectCategory,
  };
}
