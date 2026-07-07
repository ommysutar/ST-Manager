"use client";

import { useSyncExternalStore } from "react";

import { EMPTY_WHATSAPP_SETTINGS } from "@/hooks/empty-server-snapshots";
import { WHATSAPP_SETTINGS_UPDATED_EVENT } from "@/lib/whatsapp/events";
import { getWhatsAppSettingsSnapshot } from "@/lib/whatsapp/snapshots";
import { initializeWhatsAppSettingsSnapshots, loadWhatsAppSettings } from "@/lib/whatsapp/storage";

let snapshotsReady = false;

function ensureReady() {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeWhatsAppSettingsSnapshots();
  snapshotsReady = true;
}

export function useWhatsAppSettings() {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureReady();
      const handler = () => {
        initializeWhatsAppSettingsSnapshots();
        onStoreChange();
      };
      window.addEventListener(WHATSAPP_SETTINGS_UPDATED_EVENT, handler);
      return () => window.removeEventListener(WHATSAPP_SETTINGS_UPDATED_EVENT, handler);
    },
    () => {
      ensureReady();
      return getWhatsAppSettingsSnapshot() ?? loadWhatsAppSettings();
    },
    () => EMPTY_WHATSAPP_SETTINGS,
  );
}
