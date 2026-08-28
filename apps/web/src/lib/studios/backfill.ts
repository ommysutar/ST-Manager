import type { StudioRoomResponseDto } from "@st-manager/contracts";

import { studioRoomsApi } from "@/lib/api-client";
import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";
import { DEFAULT_STUDIOS } from "@/lib/studios/constants";
import type { StudioRoom } from "@/lib/studios/types";
import { STUDIOS_STORAGE_KEY } from "@/lib/studios/types";
import { isBrowserOnline } from "@/lib/sync";

import { isLocalRoomId } from "./offline-queue";
import { studioRoomToCreateDto } from "./map-dto";

const ROOMS_CACHE_KEY = "st-manager-rooms-cache";
const BACKFILL_REPORT_KEY = "st-manager-rooms-backfill-report";

export function isLegacyLocalRoomId(id: string): boolean {
  return !isLocalRoomId(id) && !id.startsWith("c");
}

export interface LegacyRoomsBackfillReport {
  generatedAt: string;
  studioId: string;
  migratedFromLegacyStorage: boolean;
  legacyCandidates: number;
  uploaded: number;
  skipped: number;
}

function persistBackfillReport(report: LegacyRoomsBackfillReport): void {
  const studioId = getActiveStudioId();
  if (!studioId) return;
  writeStudioScopedItem(BACKFILL_REPORT_KEY, JSON.stringify(report), studioId);
}

export function migrateLegacyRoomsToStudioCache(): boolean {
  const studioId = getActiveStudioId();
  if (!studioId || typeof window === "undefined") {
    return false;
  }
  if (readStudioScopedItem(ROOMS_CACHE_KEY, studioId)) {
    return false;
  }
  try {
    const legacy = window.localStorage.getItem(STUDIOS_STORAGE_KEY);
    if (!legacy) {
      return false;
    }
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed)) {
      writeStudioScopedItem(ROOMS_CACHE_KEY, legacy, studioId);
      return true;
    }
  } catch {
    // ignore corrupt legacy cache
  }
  return false;
}

function findServerMatch(
  local: StudioRoom,
  serverRooms: StudioRoomResponseDto[],
): StudioRoomResponseDto | undefined {
  return serverRooms.find((room) => {
    if (room.deletedAt) return false;
    return (
      room.name.trim().toLowerCase() === local.name.trim().toLowerCase() &&
      (room.roomName ?? "") === (local.roomName ?? "")
    );
  });
}

export async function runLegacyRoomsBackfill(
  rooms: StudioRoom[] = [],
): Promise<LegacyRoomsBackfillReport> {
  const studioId = getActiveStudioId() ?? "unknown";
  const migratedFromLegacyStorage = migrateLegacyRoomsToStudioCache();

  const report: LegacyRoomsBackfillReport = {
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
    rooms.length > 0
      ? rooms.filter((room) => isLegacyLocalRoomId(room.id))
      : DEFAULT_STUDIOS;
  report.legacyCandidates = candidates.length;

  if (candidates.length === 0) {
    persistBackfillReport(report);
    return report;
  }

  const serverRooms = await (async () => {
    const pageSize = 100;
    let page = 1;
    const all: StudioRoomResponseDto[] = [];
    while (page <= 20) {
      const response = await studioRoomsApi.listStudioRooms({ page, pageSize });
      all.push(...response.data);
      if (response.data.length < pageSize) break;
      page += 1;
    }
    return all;
  })();

  if (serverRooms.length === 0 && candidates.length > 0) {
    for (const local of candidates) {
      try {
        const created = await studioRoomsApi.createStudioRoom(studioRoomToCreateDto(local));
        serverRooms.push(created);
        report.uploaded += 1;
      } catch {
        // Leave for next reconcile.
      }
    }
    persistBackfillReport(report);
    return report;
  }

  for (const local of candidates) {
    const match = findServerMatch(local, serverRooms);
    if (match) {
      report.skipped += 1;
      continue;
    }

    try {
      const created = await studioRoomsApi.createStudioRoom(studioRoomToCreateDto(local));
      serverRooms.push(created);
      report.uploaded += 1;
    } catch {
      // Leave for next reconcile.
    }
  }

  persistBackfillReport(report);
  return report;
}
