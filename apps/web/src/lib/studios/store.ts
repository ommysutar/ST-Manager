import type { StudioRoomResponseDto } from "@st-manager/contracts";

import { studioRoomsApi } from "@/lib/api-client";
import { createListEntitySyncStore } from "@/lib/sync/list-entity-store";
import { notifyStudiosUpdated } from "@/lib/studios/events";
import { setStudiosSnapshot } from "@/lib/studios/snapshots";
import type { StudioRoom } from "@/lib/studios/types";

import { runLegacyRoomsBackfill } from "./backfill";
import {
  buildOptimisticRoomRecord,
  createLocalRoomId,
  enqueuePendingRoomCreate,
  enqueuePendingRoomDelete,
  enqueuePendingRoomUpdate,
  isLocalRoomId,
  listPendingRoomCreates,
  listPendingRoomDeletes,
  listPendingRoomUpdates,
  removePendingRoomCreate,
  removePendingRoomDelete,
  removePendingRoomUpdate,
  updatePendingRoomCreate,
  type PendingRoomCreatePayload,
} from "./offline-queue";
import {
  dtoToStudioRoom,
  studioRoomPatchToUpdateDto,
  studioRoomToCreateDto,
  studioRoomToResponseDto,
} from "./map-dto";

const ROOMS_CACHE_KEY = "st-manager-rooms-cache";
const ROOMS_CURSOR_KEY = "st-manager-rooms-sync-cursor";
const ROOMS_TOMBSTONES_KEY = "st-manager-rooms-tombstones";

function sortRooms(rooms: StudioRoom[]): StudioRoom[] {
  return [...rooms].sort((left, right) => left.name.localeCompare(right.name));
}

function createPayloadFingerprint(payload: PendingRoomCreatePayload): string {
  return [payload.name.trim().toLowerCase(), payload.roomName ?? ""].join("|");
}

function findDuplicateInSnapshot(
  payload: PendingRoomCreatePayload,
  excludeLocalId?: string,
): StudioRoom | undefined {
  return entityStore.getSnapshot().find((room) => {
    if (isLocalRoomId(room.id) || room.id === excludeLocalId) {
      return false;
    }
    return (
      room.name.trim().toLowerCase() === payload.name.trim().toLowerCase() &&
      (room.roomName ?? "") === (payload.roomName ?? "")
    );
  });
}

async function loadAllRoomsFromApi(): Promise<StudioRoomResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: StudioRoomResponseDto[] = [];

  while (page <= 20) {
    const response = await studioRoomsApi.listStudioRooms({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  return all;
}

const entityStore = createListEntitySyncStore<
  StudioRoom,
  StudioRoomResponseDto,
  PendingRoomCreatePayload,
  ReturnType<typeof studioRoomPatchToUpdateDto>
>({
  cacheKey: ROOMS_CACHE_KEY,
  cursorKey: ROOMS_CURSOR_KEY,
  tombstonesKey: ROOMS_TOMBSTONES_KEY,
  api: {
    listAll: loadAllRoomsFromApi,
    pullChanges: (since) => studioRoomsApi.pullStudioRoomChanges({ since }),
    create: (payload) => studioRoomsApi.createStudioRoom(payload),
    update: (id, payload) => studioRoomsApi.updateStudioRoom(id, payload),
    delete: (id) => studioRoomsApi.deleteStudioRoom(id),
    get: (id) => studioRoomsApi.getStudioRoom(id),
  },
  maps: {
    dtoToLocal: dtoToStudioRoom,
    localToCreateDto: (room) => studioRoomToCreateDto(room),
    patchToUpdateDto: studioRoomPatchToUpdateDto,
    localToResponseDto: studioRoomToResponseDto,
    getLocalId: (room) => room.id,
  },
  queue: {
    isLocalId: isLocalRoomId,
    createLocalId: createLocalRoomId,
    listPendingCreates: listPendingRoomCreates,
    enqueuePendingCreate: enqueuePendingRoomCreate,
    updatePendingCreate: updatePendingRoomCreate,
    removePendingCreate: removePendingRoomCreate,
    buildOptimisticRecord: buildOptimisticRoomRecord,
    listPendingUpdates: listPendingRoomUpdates,
    enqueuePendingUpdate: enqueuePendingRoomUpdate,
    removePendingUpdate: removePendingRoomUpdate,
    listPendingDeletes: listPendingRoomDeletes,
    enqueuePendingDelete: enqueuePendingRoomDelete,
    removePendingDelete: removePendingRoomDelete,
  },
  sort: sortRooms,
  notifyUpdated: notifyStudiosUpdated,
  setModuleSnapshot: setStudiosSnapshot,
  findDuplicate: findDuplicateInSnapshot,
  createPayloadFingerprint,
  afterReconcile: async () => {
    await runLegacyRoomsBackfill(entityStore.getSnapshot());
  },
});

export const getRoomsStoreSnapshot = entityStore.getSnapshot;
export const setRoomsStoreSnapshot = entityStore.setSnapshot;
export const hydrateRoomsSnapshotFromCache = entityStore.hydrateFromCache;
export const reconcileRoomsFromApi = entityStore.reconcileFromApi;
export const flushPendingRoomMutations = entityStore.flushPendingMutations;
export const createRoomOfflineAware = entityStore.createOfflineAware;
export const updateRoomOfflineAware = entityStore.updateOfflineAware;
export const deleteRoomOfflineAware = entityStore.deleteOfflineAware;
export const readRoomsSyncCursor = entityStore.readSyncCursor;
export const writeRoomsSyncCursor = entityStore.writeSyncCursor;
