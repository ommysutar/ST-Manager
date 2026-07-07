import type { ClientResponseDto } from "@st-manager/contracts";

import { notifyBookingsUpdated } from "@/lib/bookings/events";
import { setBookingsSnapshot } from "@/lib/bookings/snapshots";
import { loadAllBookings } from "@/lib/bookings/storage";
import { BOOKINGS_STORAGE_KEY } from "@/lib/bookings/types";
import { notifyDocumentsUpdated } from "@/lib/documents/events";
import { setDocumentsSnapshot } from "@/lib/documents/snapshots";
import { loadAllDocuments } from "@/lib/documents/storage";
import { DOCUMENTS_STORAGE_KEY } from "@/lib/documents/types";
import { notifyProjectsUpdated } from "@/lib/inquiry/events";
import { notifyPaymentsUpdated } from "@/lib/payments/events";
import { setPaymentsSnapshot } from "@/lib/payments/snapshots";
import { loadAllPayments } from "@/lib/payments/storage";
import { PAYMENTS_STORAGE_KEY } from "@/lib/payments/types";
import { loadAllProjects, setProjectsSnapshot } from "@/lib/projects/storage";
import { PROJECTS_STORAGE_KEY } from "@/lib/projects/types";
import type { StudioProject } from "@/lib/projects/types";

export interface ClientLinkedRecords {
  projectCount: number;
  bookingCount: number;
  paymentCount: number;
  invoiceCount: number;
  hasLinkedRecords: boolean;
}

function matchesClientProject(project: StudioProject, clientId: string, client?: ClientResponseDto): boolean {
  if (project.clientId) {
    return project.clientId === clientId;
  }

  if (!client) {
    return false;
  }

  const clientPhone = client.phone?.trim() ?? "";
  const projectPhone = project.clientMobile?.trim() ?? "";
  return project.clientName === client.name && projectPhone === clientPhone;
}

export function getProjectsForClient(clientId: string, client?: ClientResponseDto): StudioProject[] {
  return loadAllProjects().filter((project) => matchesClientProject(project, clientId, client));
}

export function getClientLinkedRecords(clientId: string, client?: ClientResponseDto): ClientLinkedRecords {
  const projects = getProjectsForClient(clientId, client);
  const projectIds = new Set(projects.map((project) => project.id));

  const bookingCount = loadAllBookings().filter(
    (booking) => projectIds.has(booking.projectId) && booking.status !== "cancelled",
  ).length;

  const paymentCount = loadAllPayments().filter((payment) => projectIds.has(payment.projectId)).length;

  const documents = loadAllDocuments().filter(
    (document) => document.projectId && projectIds.has(document.projectId),
  );
  const invoiceCount = documents.filter((document) => document.type === "invoice").length;

  const projectCount = projects.length;
  const hasLinkedRecords =
    projectCount > 0 || bookingCount > 0 || paymentCount > 0 || invoiceCount > 0;

  return {
    projectCount,
    bookingCount,
    paymentCount,
    invoiceCount,
    hasLinkedRecords,
  };
}

/** Removes local projects, bookings, payments, and documents linked to a client. */
export function removeClientLinkedLocalData(clientId: string, client?: ClientResponseDto): void {
  if (typeof window === "undefined") {
    return;
  }

  const projects = getProjectsForClient(clientId, client);
  const projectIds = new Set(projects.map((project) => project.id));

  if (projectIds.size === 0) {
    return;
  }

  const nextProjects = loadAllProjects().filter((project) => !projectIds.has(project.id));
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
  setProjectsSnapshot(nextProjects);
  notifyProjectsUpdated();

  const nextBookings = loadAllBookings().filter((booking) => !projectIds.has(booking.projectId));
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(nextBookings));
  setBookingsSnapshot(nextBookings);
  notifyBookingsUpdated();

  const nextPayments = loadAllPayments().filter((payment) => !projectIds.has(payment.projectId));
  localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(nextPayments));
  setPaymentsSnapshot(nextPayments);
  notifyPaymentsUpdated();

  const nextDocuments = loadAllDocuments().filter(
    (document) => !document.projectId || !projectIds.has(document.projectId),
  );
  localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(nextDocuments));
  setDocumentsSnapshot(nextDocuments);
  notifyDocumentsUpdated();
}
