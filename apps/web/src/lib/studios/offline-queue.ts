import type { CreateStudioRoomDto } from "@st-manager/contracts";

import { createOfflineQueue } from "@/lib/sync/offline-queue";
import type { StudioRoom } from "@/lib/studios/types";

import { dtoToStudioRoom, studioRoomToResponseDto } from "./map-dto";

const queue = createOfflineQueue<
  CreateStudioRoomDto,
  ReturnType<typeof import("./map-dto").studioRoomPatchToUpdateDto>,
  StudioRoom
>({
  pendingCreatesKey: "st-manager-rooms-pending-creates",
  pendingUpdatesKey: "st-manager-rooms-pending-updates",
  pendingDeletesKey: "st-manager-rooms-pending-deletes",
  localIdPrefix: "local_room_",
  buildOptimisticRecord: (localId, payload) =>
    dtoToStudioRoom(
      studioRoomToResponseDto(
        {
          id: localId,
          name: payload.name,
          roomName: payload.roomName ?? undefined,
          description: payload.description ?? "",
          color: payload.color ?? "#6366f1",
          active: payload.active ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        "",
      ),
    ),
});

export const isLocalRoomId = queue.isLocalId;
export const createLocalRoomId = queue.createLocalId;
export const listPendingRoomCreates = queue.listPendingCreates;
export const enqueuePendingRoomCreate = queue.enqueuePendingCreate;
export const updatePendingRoomCreate = queue.updatePendingCreate;
export const removePendingRoomCreate = queue.removePendingCreate;
export const buildOptimisticRoomRecord = queue.buildOptimisticRecord;
export const listPendingRoomUpdates = queue.listPendingUpdates;
export const enqueuePendingRoomUpdate = queue.enqueuePendingUpdate;
export const removePendingRoomUpdate = queue.removePendingUpdate;
export const listPendingRoomDeletes = queue.listPendingDeletes;
export const enqueuePendingRoomDelete = queue.enqueuePendingDelete;
export const removePendingRoomDelete = queue.removePendingDelete;

export type PendingRoomCreatePayload = CreateStudioRoomDto;
