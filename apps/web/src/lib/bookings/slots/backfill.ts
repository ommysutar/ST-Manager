import type { BookingSlotDefinitionResponseDto } from "@st-manager/contracts";

import { bookingSlotDefinitionsApi } from "@/lib/api-client";
import { DEFAULT_BOOKING_SLOTS } from "@/lib/bookings/constants";
import type { BookingSlot } from "@/lib/bookings/types";
import { BOOKING_SLOTS_STORAGE_KEY } from "@/lib/bookings/types";
import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";
import { isBrowserOnline } from "@/lib/sync";

import { isLocalSlotId } from "./offline-queue";
import { bookingSlotToCreateDto } from "./map-dto";

const SLOTS_CACHE_KEY = "st-manager-slots-cache";
const BACKFILL_REPORT_KEY = "st-manager-slots-backfill-report";

export function isLegacyLocalSlotId(id: string): boolean {
  return !isLocalSlotId(id) && !id.startsWith("c");
}

export interface LegacySlotsBackfillReport {
  generatedAt: string;
  studioId: string;
  migratedFromLegacyStorage: boolean;
  legacyCandidates: number;
  uploaded: number;
  skipped: number;
}

function persistBackfillReport(report: LegacySlotsBackfillReport): void {
  const studioId = getActiveStudioId();
  if (!studioId) return;
  writeStudioScopedItem(BACKFILL_REPORT_KEY, JSON.stringify(report), studioId);
}

export function migrateLegacySlotsToStudioCache(): boolean {
  const studioId = getActiveStudioId();
  if (!studioId || typeof window === "undefined") {
    return false;
  }
  if (readStudioScopedItem(SLOTS_CACHE_KEY, studioId)) {
    return false;
  }
  try {
    const legacy = window.localStorage.getItem(BOOKING_SLOTS_STORAGE_KEY);
    if (!legacy) {
      return false;
    }
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed)) {
      writeStudioScopedItem(SLOTS_CACHE_KEY, legacy, studioId);
      return true;
    }
  } catch {
    // ignore corrupt legacy cache
  }
  return false;
}

/** When server has no slot definitions, upload defaults so first reconcile seeds from server. */
export async function seedDefaultSlotsOnServerIfEmpty(): Promise<void> {
  if (!isBrowserOnline()) {
    return;
  }

  const response = await bookingSlotDefinitionsApi.listBookingSlotDefinitions({
    page: 1,
    pageSize: 1,
  });
  if (response.data.length > 0) {
    return;
  }

  for (const [index, slot] of DEFAULT_BOOKING_SLOTS.entries()) {
    try {
      await bookingSlotDefinitionsApi.createBookingSlotDefinition(
        bookingSlotToCreateDto({ ...slot, sortOrder: index }),
      );
    } catch {
      // Leave for next reconcile.
    }
  }
}

function findServerMatch(
  local: BookingSlot,
  serverSlots: BookingSlotDefinitionResponseDto[],
): BookingSlotDefinitionResponseDto | undefined {
  return serverSlots.find((slot) => {
    if (slot.deletedAt) return false;
    return (
      slot.label === local.label &&
      slot.startHour === local.startHour &&
      slot.startMinute === local.startMinute &&
      slot.endHour === local.endHour &&
      slot.endMinute === local.endMinute
    );
  });
}

export async function runLegacySlotsBackfill(
  slots: BookingSlot[] = [],
): Promise<LegacySlotsBackfillReport> {
  const studioId = getActiveStudioId() ?? "unknown";
  const migratedFromLegacyStorage = migrateLegacySlotsToStudioCache();

  const report: LegacySlotsBackfillReport = {
    generatedAt: new Date().toISOString(),
    studioId,
    migratedFromLegacyStorage,
    legacyCandidates: 0,
    uploaded: 0,
    skipped: 0,
  };

  if (!studioId || studioId === "unknown" || !isBrowserOnline()) {
    persistBackfillReport(report);
    return report;
  }

  const candidates =
    slots.length > 0 ? slots.filter((slot) => isLegacyLocalSlotId(slot.id)) : [];
  report.legacyCandidates = candidates.length;

  const serverSlots = await (async () => {
    const pageSize = 100;
    let page = 1;
    const all: BookingSlotDefinitionResponseDto[] = [];
    while (page <= 20) {
      const response = await bookingSlotDefinitionsApi.listBookingSlotDefinitions({
        page,
        pageSize,
      });
      all.push(...response.data);
      if (response.data.length < pageSize) break;
      page += 1;
    }
    return all;
  })();

  if (serverSlots.length === 0) {
    await seedDefaultSlotsOnServerIfEmpty();
    persistBackfillReport(report);
    return report;
  }

  for (const local of candidates) {
    const match = findServerMatch(local, serverSlots);
    if (match) {
      report.skipped += 1;
      continue;
    }

    try {
      const created = await bookingSlotDefinitionsApi.createBookingSlotDefinition(
        bookingSlotToCreateDto(local),
      );
      serverSlots.push(created);
      report.uploaded += 1;
    } catch {
      // Leave for next reconcile.
    }
  }

  persistBackfillReport(report);
  return report;
}
