"use client";

import { useSyncExternalStore } from "react";

import { PAYMENTS_UPDATED_EVENT } from "@/lib/payments/events";
import { getPaymentsSnapshot, initializePaymentSnapshots } from "@/lib/payments/storage";
import type { PaymentRecord } from "@/lib/payments/types";

let snapshotsReady = false;

function ensurePaymentSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializePaymentSnapshots();
  snapshotsReady = true;
}

export function usePayments(): PaymentRecord[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensurePaymentSnapshotsReady();

      const handler = () => {
        initializePaymentSnapshots();
        onStoreChange();
      };

      window.addEventListener(PAYMENTS_UPDATED_EVENT, handler);
      return () => window.removeEventListener(PAYMENTS_UPDATED_EVENT, handler);
    },
    () => {
      ensurePaymentSnapshotsReady();
      return getPaymentsSnapshot();
    },
    () => [],
  );
}

export function usePaymentsForProject(projectId: string): PaymentRecord[] {
  const payments = usePayments();
  return payments.filter((payment) => payment.projectId === projectId);
}
