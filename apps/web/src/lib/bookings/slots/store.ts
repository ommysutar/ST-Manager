import type { BookingSlotDefinitionResponseDto } from "@st-manager/contracts";

import { bookingSlotDefinitionsApi } from "@/lib/api-client";
import { notifyBookingSlotsUpdated } from "@/lib/bookings/events";
import { setBookingSlotsSnapshot } from "@/lib/bookings/snapshots";
import { slotStartMinutes } from "@/lib/bookings/slot-utils";
import type { BookingSlot } from "@/lib/bookings/types";
import { createListEntitySyncStore } from "@/lib/sync/list-entity-store";

import { runLegacySlotsBackfill, seedDefaultSlotsOnServerIfEmpty } from "./backfill";
import {
  buildOptimisticSlotRecord,
  createLocalSlotId,
  enqueuePendingSlotCreate,
  enqueuePendingSlotDelete,
  enqueuePendingSlotUpdate,
  isLocalSlotId,
  listPendingSlotCreates,
  listPendingSlotDeletes,
  listPendingSlotUpdates,
  removePendingSlotCreate,
  removePendingSlotDelete,
  removePendingSlotUpdate,
  updatePendingSlotCreate,
  type PendingSlotCreatePayload,
} from "./offline-queue";
import {
  bookingSlotPatchToUpdateDto,
  bookingSlotToCreateDto,
  bookingSlotToResponseDto,
  dtoToBookingSlot,
} from "./map-dto";

const SLOTS_CACHE_KEY = "st-manager-slots-cache";
const SLOTS_CURSOR_KEY = "st-manager-slots-sync-cursor";
const SLOTS_TOMBSTONES_KEY = "st-manager-slots-tombstones";

function sortSlots(slots: BookingSlot[]): BookingSlot[] {
  return [...slots].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return slotStartMinutes(left) - slotStartMinutes(right);
  });
}

function createPayloadFingerprint(payload: PendingSlotCreatePayload): string {
  return [
    payload.label,
    payload.startHour,
    payload.startMinute ?? 0,
    payload.endHour,
    payload.endMinute ?? 0,
  ].join("|");
}

function findDuplicateInSnapshot(
  payload: PendingSlotCreatePayload,
  excludeLocalId?: string,
): BookingSlot | undefined {
  return entityStore.getSnapshot().find((slot) => {
    if (isLocalSlotId(slot.id) || slot.id === excludeLocalId) {
      return false;
    }
    return (
      slot.label === payload.label &&
      slot.startHour === payload.startHour &&
      (slot.startMinute ?? 0) === (payload.startMinute ?? 0) &&
      slot.endHour === payload.endHour &&
      (slot.endMinute ?? 0) === (payload.endMinute ?? 0)
    );
  });
}

async function loadAllSlotsFromApi(): Promise<BookingSlotDefinitionResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: BookingSlotDefinitionResponseDto[] = [];

  while (page <= 20) {
    const response = await bookingSlotDefinitionsApi.listBookingSlotDefinitions({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  return all;
}

const entityStore = createListEntitySyncStore<
  BookingSlot,
  BookingSlotDefinitionResponseDto,
  PendingSlotCreatePayload,
  ReturnType<typeof bookingSlotPatchToUpdateDto>
>({
  cacheKey: SLOTS_CACHE_KEY,
  cursorKey: SLOTS_CURSOR_KEY,
  tombstonesKey: SLOTS_TOMBSTONES_KEY,
  api: {
    listAll: loadAllSlotsFromApi,
    pullChanges: (since) => bookingSlotDefinitionsApi.pullBookingSlotDefinitionChanges({ since }),
    create: (payload) => bookingSlotDefinitionsApi.createBookingSlotDefinition(payload),
    update: (id, payload) => bookingSlotDefinitionsApi.updateBookingSlotDefinition(id, payload),
    delete: (id) => bookingSlotDefinitionsApi.deleteBookingSlotDefinition(id),
    get: (id) => bookingSlotDefinitionsApi.getBookingSlotDefinition(id),
  },
  maps: {
    dtoToLocal: dtoToBookingSlot,
    localToCreateDto: (slot) => bookingSlotToCreateDto(slot),
    patchToUpdateDto: bookingSlotPatchToUpdateDto,
    localToResponseDto: bookingSlotToResponseDto,
    getLocalId: (slot) => slot.id,
  },
  queue: {
    isLocalId: isLocalSlotId,
    createLocalId: createLocalSlotId,
    listPendingCreates: listPendingSlotCreates,
    enqueuePendingCreate: enqueuePendingSlotCreate,
    updatePendingCreate: updatePendingSlotCreate,
    removePendingCreate: removePendingSlotCreate,
    buildOptimisticRecord: buildOptimisticSlotRecord,
    listPendingUpdates: listPendingSlotUpdates,
    enqueuePendingUpdate: enqueuePendingSlotUpdate,
    removePendingUpdate: removePendingSlotUpdate,
    listPendingDeletes: listPendingSlotDeletes,
    enqueuePendingDelete: enqueuePendingSlotDelete,
    removePendingDelete: removePendingSlotDelete,
  },
  sort: sortSlots,
  notifyUpdated: notifyBookingSlotsUpdated,
  setModuleSnapshot: setBookingSlotsSnapshot,
  findDuplicate: findDuplicateInSnapshot,
  createPayloadFingerprint,
  onFirstEmptyRefresh: seedDefaultSlotsOnServerIfEmpty,
  afterReconcile: async () => {
    await runLegacySlotsBackfill(entityStore.getSnapshot());
  },
});

export const getSlotsStoreSnapshot = entityStore.getSnapshot;
export const setSlotsStoreSnapshot = entityStore.setSnapshot;
export const hydrateSlotsSnapshotFromCache = entityStore.hydrateFromCache;
export const reconcileSlotsFromApi = entityStore.reconcileFromApi;
export const flushPendingSlotMutations = entityStore.flushPendingMutations;
export const createSlotOfflineAware = entityStore.createOfflineAware;
export const updateSlotOfflineAware = entityStore.updateOfflineAware;
export const deleteSlotOfflineAware = entityStore.deleteOfflineAware;
export const readSlotsSyncCursor = entityStore.readSyncCursor;
export const writeSlotsSyncCursor = entityStore.writeSyncCursor;
