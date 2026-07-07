import { DEFAULT_STUDIO_SERVICES } from "./constants";
import type { SavedInquiry, StudioService } from "./types";

const defaultActiveServices = DEFAULT_STUDIO_SERVICES.filter((service) => service.active);

let inquiriesSnapshot: SavedInquiry[] = [];
let allServicesSnapshot: StudioService[] = DEFAULT_STUDIO_SERVICES;
let activeServicesSnapshot: StudioService[] = defaultActiveServices;

export function getInquiriesSnapshot(): SavedInquiry[] {
  return inquiriesSnapshot;
}

export function setInquiriesSnapshot(next: SavedInquiry[]): SavedInquiry[] {
  inquiriesSnapshot = next;
  return inquiriesSnapshot;
}

export function getInquirySnapshot(id: string): SavedInquiry | null {
  return inquiriesSnapshot.find((inquiry) => inquiry.id === id) ?? null;
}

export function getAllServicesSnapshot(): StudioService[] {
  return allServicesSnapshot;
}

export function setAllServicesSnapshot(next: StudioService[]): StudioService[] {
  allServicesSnapshot = next;
  activeServicesSnapshot = next.filter((service) => service.active);
  return allServicesSnapshot;
}

export function getActiveServicesSnapshot(): StudioService[] {
  return activeServicesSnapshot;
}
