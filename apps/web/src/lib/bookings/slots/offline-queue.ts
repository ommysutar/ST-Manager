import type { CreateBookingSlotDefinitionDto } from "@st-manager/contracts";

import { createOfflineQueue } from "@/lib/sync/offline-queue";
import type { BookingSlot } from "@/lib/bookings/types";

import { dtoToBookingSlot, bookingSlotToResponseDto } from "./map-dto";

const queue = createOfflineQueue<
  CreateBookingSlotDefinitionDto,
  ReturnType<typeof import("./map-dto").bookingSlotPatchToUpdateDto>,
  BookingSlot
>({
  pendingCreatesKey: "st-manager-slots-pending-creates",
  pendingUpdatesKey: "st-manager-slots-pending-updates",
  pendingDeletesKey: "st-manager-slots-pending-deletes",
  localIdPrefix: "local_slot_",
  buildOptimisticRecord: (localId, payload) =>
    dtoToBookingSlot(
      bookingSlotToResponseDto(
        {
          id: localId,
          label: payload.label,
          startHour: payload.startHour,
          startMinute: payload.startMinute ?? 0,
          endHour: payload.endHour,
          endMinute: payload.endMinute ?? 0,
          isCustom: payload.isCustom ?? false,
          sortOrder: payload.sortOrder ?? 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        "",
      ),
    ),
});

export const isLocalSlotId = queue.isLocalId;
export const createLocalSlotId = queue.createLocalId;
export const listPendingSlotCreates = queue.listPendingCreates;
export const enqueuePendingSlotCreate = queue.enqueuePendingCreate;
export const updatePendingSlotCreate = queue.updatePendingCreate;
export const removePendingSlotCreate = queue.removePendingCreate;
export const buildOptimisticSlotRecord = queue.buildOptimisticRecord;
export const listPendingSlotUpdates = queue.listPendingUpdates;
export const enqueuePendingSlotUpdate = queue.enqueuePendingUpdate;
export const removePendingSlotUpdate = queue.removePendingUpdate;
export const listPendingSlotDeletes = queue.listPendingDeletes;
export const enqueuePendingSlotDelete = queue.enqueuePendingDelete;
export const removePendingSlotDelete = queue.removePendingDelete;

export type PendingSlotCreatePayload = CreateBookingSlotDefinitionDto;
