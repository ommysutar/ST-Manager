import type { StudioServiceResponseDto } from "@st-manager/contracts";

import { studioServicesApi } from "@/lib/api-client";
import { notifyServicePricingUpdated } from "@/lib/inquiry/events";
import { setAllServicesSnapshot } from "@/lib/inquiry/snapshots";
import type { StudioService } from "@/lib/inquiry/types";
import { createListEntitySyncStore } from "@/lib/sync/list-entity-store";

import { runLegacyServicesBackfill } from "./backfill";
import {
  buildOptimisticServiceRecord,
  createLocalServiceId,
  enqueuePendingServiceCreate,
  enqueuePendingServiceDelete,
  enqueuePendingServiceUpdate,
  isLocalServiceId,
  listPendingServiceCreates,
  listPendingServiceDeletes,
  listPendingServiceUpdates,
  removePendingServiceCreate,
  removePendingServiceDelete,
  removePendingServiceUpdate,
  updatePendingServiceCreate,
  type PendingServiceCreatePayload,
} from "./offline-queue";
import {
  dtoToStudioService,
  studioServicePatchToUpdateDto,
  studioServiceToCreateDto,
  studioServiceToResponseDto,
} from "./map-dto";

const SERVICES_CACHE_KEY = "st-manager-services-cache";
const SERVICES_CURSOR_KEY = "st-manager-services-sync-cursor";
const SERVICES_TOMBSTONES_KEY = "st-manager-services-tombstones";

function sortServices(services: StudioService[]): StudioService[] {
  return [...services].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

function createPayloadFingerprint(payload: PendingServiceCreatePayload): string {
  return [payload.name.trim().toLowerCase(), payload.category ?? "", payload.prices.standard].join(
    "|",
  );
}

function findDuplicateInSnapshot(
  payload: PendingServiceCreatePayload,
  excludeLocalId?: string,
): StudioService | undefined {
  return entityStore.getSnapshot().find((service) => {
    if (isLocalServiceId(service.id) || service.id === excludeLocalId) {
      return false;
    }
    return (
      service.name.trim().toLowerCase() === payload.name.trim().toLowerCase() &&
      service.prices.standard === payload.prices.standard
    );
  });
}

async function loadAllStudioServicesFromApi(): Promise<StudioServiceResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: StudioServiceResponseDto[] = [];

  while (page <= 20) {
    const response = await studioServicesApi.listStudioServices({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  return all;
}

const entityStore = createListEntitySyncStore<
  StudioService,
  StudioServiceResponseDto,
  PendingServiceCreatePayload,
  ReturnType<typeof studioServicePatchToUpdateDto>
>({
  cacheKey: SERVICES_CACHE_KEY,
  cursorKey: SERVICES_CURSOR_KEY,
  tombstonesKey: SERVICES_TOMBSTONES_KEY,
  api: {
    listAll: loadAllStudioServicesFromApi,
    pullChanges: (since) => studioServicesApi.pullStudioServiceChanges({ since }),
    create: (payload) => studioServicesApi.createStudioService(payload),
    update: (id, payload) => studioServicesApi.updateStudioService(id, payload),
    delete: (id) => studioServicesApi.deleteStudioService(id),
    get: (id) => studioServicesApi.getStudioService(id),
  },
  maps: {
    dtoToLocal: dtoToStudioService,
    localToCreateDto: (service) => studioServiceToCreateDto(service),
    patchToUpdateDto: studioServicePatchToUpdateDto,
    localToResponseDto: studioServiceToResponseDto,
    getLocalId: (service) => service.id,
  },
  queue: {
    isLocalId: isLocalServiceId,
    createLocalId: createLocalServiceId,
    listPendingCreates: listPendingServiceCreates,
    enqueuePendingCreate: enqueuePendingServiceCreate,
    updatePendingCreate: updatePendingServiceCreate,
    removePendingCreate: removePendingServiceCreate,
    buildOptimisticRecord: buildOptimisticServiceRecord,
    listPendingUpdates: listPendingServiceUpdates,
    enqueuePendingUpdate: enqueuePendingServiceUpdate,
    removePendingUpdate: removePendingServiceUpdate,
    listPendingDeletes: listPendingServiceDeletes,
    enqueuePendingDelete: enqueuePendingServiceDelete,
    removePendingDelete: removePendingServiceDelete,
  },
  sort: sortServices,
  notifyUpdated: notifyServicePricingUpdated,
  setModuleSnapshot: setAllServicesSnapshot,
  findDuplicate: findDuplicateInSnapshot,
  createPayloadFingerprint,
  afterReconcile: async () => {
    await runLegacyServicesBackfill(entityStore.getSnapshot());
  },
});

export {
  buildOptimisticServiceRecord,
  createLocalServiceId,
  enqueuePendingServiceCreate,
  isLocalServiceId,
  listPendingServiceCreates,
  removePendingServiceCreate,
  updatePendingServiceCreate,
  type PendingServiceCreatePayload,
};

export const getServicesStoreSnapshot = entityStore.getSnapshot;
export const setServicesStoreSnapshot = entityStore.setSnapshot;
export const hydrateServicesSnapshotFromCache = entityStore.hydrateFromCache;
export const reconcileServicesFromApi = entityStore.reconcileFromApi;
export const refreshServicesSnapshot = entityStore.refreshSnapshot;
export const flushPendingServiceMutations = entityStore.flushPendingMutations;
export const createServiceOfflineAware = entityStore.createOfflineAware;
export const updateServiceOfflineAware = entityStore.updateOfflineAware;
export const deleteServiceOfflineAware = entityStore.deleteOfflineAware;
export const upsertServiceInSnapshot = entityStore.upsertInSnapshot;
export const removeServiceFromSnapshot = entityStore.removeFromSnapshot;
export const readServicesSyncCursor = entityStore.readSyncCursor;
export const writeServicesSyncCursor = entityStore.writeSyncCursor;
