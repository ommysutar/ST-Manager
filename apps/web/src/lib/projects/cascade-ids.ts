import { notifyBookingsUpdated } from "@/lib/bookings/events";
import {
  getBookingsStoreSnapshot,
  hydrateBookingsSnapshotFromCache,
  upsertBookingInSnapshot,
} from "@/lib/bookings/store";
import {
  listPendingProjectBookingCreates,
  updatePendingProjectBookingCreate,
} from "@/lib/bookings/offline-queue";
import { notifyDocumentsUpdated } from "@/lib/documents/events";
import { setDocumentsSnapshot } from "@/lib/documents/snapshots";
import { loadAllDocuments } from "@/lib/documents/storage";
import { DOCUMENTS_STORAGE_KEY } from "@/lib/documents/types";
import { remapInquiryProjectReferences } from "@/lib/inquiry/storage";
import { notifyPaymentsUpdated } from "@/lib/payments/events";
import { setPaymentsSnapshot } from "@/lib/payments/snapshots";
import { loadAllPayments } from "@/lib/payments/storage";
import { PAYMENTS_STORAGE_KEY } from "@/lib/payments/types";

/**
 * Rewrites persistent local references when a project id changes
 * (legacy → server, or local_prj_* → server).
 */
export function cascadeProjectIdRemap(oldProjectId: string, newProjectId: string): void {
  if (typeof window === "undefined" || oldProjectId === newProjectId) {
    return;
  }

  let bookingsChanged = false;
  hydrateBookingsSnapshotFromCache();
  const nextBookings = getBookingsStoreSnapshot().map((booking) => {
    if (booking.projectId !== oldProjectId) {
      return booking;
    }
    bookingsChanged = true;
    return { ...booking, projectId: newProjectId, updatedAt: new Date().toISOString() };
  });
  if (bookingsChanged) {
    for (const booking of nextBookings) {
      upsertBookingInSnapshot(booking);
    }
    notifyBookingsUpdated();
  }

  for (const pending of listPendingProjectBookingCreates()) {
    if (pending.payload.projectId === oldProjectId) {
      updatePendingProjectBookingCreate(pending.localId, {
        payload: { ...pending.payload, projectId: newProjectId },
      });
    }
  }

  let paymentsChanged = false;
  const nextPayments = loadAllPayments().map((payment) => {
    if (payment.projectId !== oldProjectId) {
      return payment;
    }
    paymentsChanged = true;
    return { ...payment, projectId: newProjectId, updatedAt: new Date().toISOString() };
  });
  if (paymentsChanged) {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(nextPayments));
    setPaymentsSnapshot(nextPayments);
    notifyPaymentsUpdated();
  }

  let documentsChanged = false;
  const nextDocuments = loadAllDocuments().map((document) => {
    if (document.projectId !== oldProjectId) {
      return document;
    }
    documentsChanged = true;
    return { ...document, projectId: newProjectId, updatedAt: new Date().toISOString() };
  });
  if (documentsChanged) {
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(nextDocuments));
    setDocumentsSnapshot(nextDocuments);
    notifyDocumentsUpdated();
  }

  remapInquiryProjectReferences(oldProjectId, newProjectId);
}
