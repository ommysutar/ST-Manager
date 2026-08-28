import type { StudioServiceResponseDto } from "@st-manager/contracts";

import { studioServicesApi } from "@/lib/api-client";
import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";
import { DEFAULT_STUDIO_SERVICES } from "@/lib/inquiry/constants";
import type { StudioService } from "@/lib/inquiry/types";
import { SERVICE_PRICING_STORAGE_KEY } from "@/lib/inquiry/types";
import { isBrowserOnline } from "@/lib/sync";

import { isLocalServiceId } from "./offline-queue";
import { studioServiceToCreateDto } from "./map-dto";

const SERVICES_CACHE_KEY = "st-manager-services-cache";
const BACKFILL_REPORT_KEY = "st-manager-services-backfill-report";

/** Legacy browser-generated ids (`svc_*`, demo ids), not offline queue or server cuid. */
export function isLegacyLocalServiceId(id: string): boolean {
  return !isLocalServiceId(id) && !id.startsWith("c");
}

export interface LegacyServicesBackfillReport {
  generatedAt: string;
  studioId: string;
  migratedFromLegacyStorage: boolean;
  legacyCandidates: number;
  uploaded: number;
  skipped: number;
}

function persistBackfillReport(report: LegacyServicesBackfillReport): void {
  const studioId = getActiveStudioId();
  if (!studioId) return;
  writeStudioScopedItem(BACKFILL_REPORT_KEY, JSON.stringify(report), studioId);
}

export function migrateLegacyServicesToStudioCache(): boolean {
  const studioId = getActiveStudioId();
  if (!studioId || typeof window === "undefined") {
    return false;
  }
  if (readStudioScopedItem(SERVICES_CACHE_KEY, studioId)) {
    return false;
  }
  try {
    const legacy = window.localStorage.getItem(SERVICE_PRICING_STORAGE_KEY);
    if (!legacy) {
      return false;
    }
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed)) {
      writeStudioScopedItem(SERVICES_CACHE_KEY, legacy, studioId);
      return true;
    }
  } catch {
    // ignore corrupt legacy cache
  }
  return false;
}

function findServerMatch(
  local: StudioService,
  serverServices: StudioServiceResponseDto[],
): StudioServiceResponseDto | undefined {
  return serverServices.find((service) => {
    if (service.deletedAt) return false;
    return (
      service.name.trim().toLowerCase() === local.name.trim().toLowerCase() &&
      service.prices.standard === local.prices.standard
    );
  });
}

export async function runLegacyServicesBackfill(
  services: StudioService[] = [],
): Promise<LegacyServicesBackfillReport> {
  const studioId = getActiveStudioId() ?? "unknown";
  const migratedFromLegacyStorage = migrateLegacyServicesToStudioCache();

  const report: LegacyServicesBackfillReport = {
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
    services.length > 0
      ? services.filter((service) => isLegacyLocalServiceId(service.id))
      : DEFAULT_STUDIO_SERVICES;
  report.legacyCandidates = candidates.length;

  if (candidates.length === 0) {
    persistBackfillReport(report);
    return report;
  }

  const serverServices = await (async () => {
    const pageSize = 100;
    let page = 1;
    const all: StudioServiceResponseDto[] = [];
    while (page <= 20) {
      const response = await studioServicesApi.listStudioServices({ page, pageSize });
      all.push(...response.data);
      if (response.data.length < pageSize) break;
      page += 1;
    }
    return all;
  })();

  if (serverServices.length === 0 && candidates.length > 0) {
    for (const local of candidates) {
      try {
        const created = await studioServicesApi.createStudioService(
          studioServiceToCreateDto(local, candidates.indexOf(local)),
        );
        serverServices.push(created);
        report.uploaded += 1;
      } catch {
        // Leave for next reconcile.
      }
    }
    persistBackfillReport(report);
    return report;
  }

  for (const local of candidates) {
    const match = findServerMatch(local, serverServices);
    if (match) {
      report.skipped += 1;
      continue;
    }

    try {
      const created = await studioServicesApi.createStudioService(
        studioServiceToCreateDto(local, candidates.indexOf(local)),
      );
      serverServices.push(created);
      report.uploaded += 1;
    } catch {
      // Leave for next reconcile.
    }
  }

  persistBackfillReport(report);
  return report;
}

export function readLastServicesBackfillReport(): LegacyServicesBackfillReport | null {
  const studioId = getActiveStudioId();
  if (!studioId) return null;
  try {
    const raw = readStudioScopedItem(BACKFILL_REPORT_KEY, studioId);
    if (!raw) return null;
    return JSON.parse(raw) as LegacyServicesBackfillReport;
  } catch {
    return null;
  }
}
