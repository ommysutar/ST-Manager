"use client";

import { useSyncExternalStore } from "react";

import { EMPTY_PAYMENTS } from "@/hooks/empty-server-snapshots";
import { PAYMENTS_UPDATED_EVENT } from "@/lib/payments/events";
import { requestPaymentApiReconcile } from "@/lib/payments/reconcile";
import { hydratePaymentsSnapshotFromCache } from "@/lib/payments/store";
import { getPaymentsSnapshot, listPayments, listPaymentsByProject } from "@/lib/payments/storage";
import type { PaymentRecord } from "@/lib/payments/types";

let snapshotsReady = false;
let reconcileStarted = false;

function ensurePaymentSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializePaymentSnapshots();
  snapshotsReady = true;
}

function initializePaymentSnapshots(): void {
  hydratePaymentsSnapshotFromCache();
}

function ensurePaymentReconcile(): void {
  if (typeof window === "undefined" || reconcileStarted) {
    return;
  }
  reconcileStarted = true;
  void requestPaymentApiReconcile();
}

export function usePayments(): PaymentRecord[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensurePaymentSnapshotsReady();
      ensurePaymentReconcile();

      const handler = () => {
        initializePaymentSnapshots();
        onStoreChange();
      };

      window.addEventListener(PAYMENTS_UPDATED_EVENT, handler);
      window.addEventListener("st-manager-projects-updated", handler);
      return () => {
        window.removeEventListener(PAYMENTS_UPDATED_EVENT, handler);
        window.removeEventListener("st-manager-projects-updated", handler);
      };
    },
    () => {
      ensurePaymentSnapshotsReady();
      return getPaymentsSnapshot();
    },
    () => EMPTY_PAYMENTS,
  );
}

export function usePaymentsForProject(projectId: string): PaymentRecord[] {
  const payments = usePayments();
  return payments.filter((payment) => payment.projectId === projectId);
}

export function refreshPaymentsSnapshot(): PaymentRecord[] {
  initializePaymentSnapshots();
  return listPayments();
}

export function refreshProjectPayments(projectId: string): PaymentRecord[] {
  return listPaymentsByProject(projectId);
}
