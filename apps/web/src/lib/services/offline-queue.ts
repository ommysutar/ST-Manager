import type { CreateStudioServiceDto } from "@st-manager/contracts";

import { createOfflineQueue } from "@/lib/sync/offline-queue";

import { dtoToStudioService, studioServiceToResponseDto } from "./map-dto";

const queue = createOfflineQueue<CreateStudioServiceDto, ReturnType<typeof import("./map-dto").studioServicePatchToUpdateDto>, import("@/lib/inquiry/types").StudioService>({
  pendingCreatesKey: "st-manager-services-pending-creates",
  pendingUpdatesKey: "st-manager-services-pending-updates",
  pendingDeletesKey: "st-manager-services-pending-deletes",
  localIdPrefix: "local_svc_",
  buildOptimisticRecord: (localId, payload) =>
    dtoToStudioService(
      studioServiceToResponseDto(
        {
          id: localId,
          name: payload.name,
          price: payload.prices.standard,
          prices: payload.prices,
          category: payload.category ?? "",
          description: payload.description ?? "",
          active: payload.active ?? true,
          mandatory: payload.mandatory ?? false,
          isStudioRent: payload.isStudioRent ?? false,
        },
        "",
      ),
    ),
});

export const {
  isLocalServiceId,
  createLocalServiceId,
  listPendingServiceCreates,
  enqueuePendingServiceCreate,
  updatePendingServiceCreate,
  removePendingServiceCreate,
  buildOptimisticServiceRecord,
  listPendingServiceUpdates,
  enqueuePendingServiceUpdate,
  removePendingServiceUpdate,
  listPendingServiceDeletes,
  enqueuePendingServiceDelete,
  removePendingServiceDelete,
} = {
  isLocalServiceId: queue.isLocalId,
  createLocalServiceId: queue.createLocalId,
  listPendingServiceCreates: queue.listPendingCreates,
  enqueuePendingServiceCreate: queue.enqueuePendingCreate,
  updatePendingServiceCreate: queue.updatePendingCreate,
  removePendingServiceCreate: queue.removePendingCreate,
  buildOptimisticServiceRecord: queue.buildOptimisticRecord,
  listPendingServiceUpdates: queue.listPendingUpdates,
  enqueuePendingServiceUpdate: queue.enqueuePendingUpdate,
  removePendingServiceUpdate: queue.removePendingUpdate,
  listPendingServiceDeletes: queue.listPendingDeletes,
  enqueuePendingServiceDelete: queue.enqueuePendingDelete,
  removePendingServiceDelete: queue.removePendingDelete,
};

export type PendingServiceCreatePayload = CreateStudioServiceDto;
