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
import {
  getDocumentsStoreSnapshot,
  hydrateDocumentsSnapshotFromCache,
  listPendingDocumentCreates,
  updatePendingDocumentCreate,
  upsertDocumentInSnapshot,
} from "@/lib/documents/store";
import { remapInquiryProjectReferences } from "@/lib/inquiry/storage";
import {
  getPaymentsStoreSnapshot,
  hydratePaymentsSnapshotFromCache,
  upsertPaymentInSnapshot,
} from "@/lib/payments/store";
import {
  listPendingPaymentCreates,
  updatePendingPaymentCreate,
} from "@/lib/payments/offline-queue";
import { notifyPaymentsUpdated } from "@/lib/payments/events";

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
  hydratePaymentsSnapshotFromCache();
  const nextPayments = getPaymentsStoreSnapshot().map((payment) => {
    if (payment.projectId !== oldProjectId) {
      return payment;
    }
    paymentsChanged = true;
    return { ...payment, projectId: newProjectId };
  });
  if (paymentsChanged) {
    for (const payment of nextPayments) {
      upsertPaymentInSnapshot(payment);
    }
    notifyPaymentsUpdated();
  }

  for (const pending of listPendingPaymentCreates()) {
    if (pending.payload.projectId === oldProjectId) {
      updatePendingPaymentCreate(pending.localId, {
        payload: { ...pending.payload, projectId: newProjectId },
      });
    }
  }

  let documentsChanged = false;
  hydrateDocumentsSnapshotFromCache();
  const nextDocuments = getDocumentsStoreSnapshot().map((document) => {
    if (document.projectId !== oldProjectId) {
      return document;
    }
    documentsChanged = true;
    return { ...document, projectId: newProjectId };
  });
  if (documentsChanged) {
    for (const document of nextDocuments) {
      if (document.projectId === newProjectId) {
        upsertDocumentInSnapshot(document);
      }
    }
    for (const pending of listPendingDocumentCreates()) {
      if (pending.payload.projectId === oldProjectId) {
        updatePendingDocumentCreate(pending.localId, {
          payload: { ...pending.payload, projectId: newProjectId },
        });
      }
    }
    notifyDocumentsUpdated();
  }

  remapInquiryProjectReferences(oldProjectId, newProjectId);
}
