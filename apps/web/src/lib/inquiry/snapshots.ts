import { DEFAULT_PROJECT_PLANS, DEFAULT_STUDIO_SERVICES } from "./constants";
import type { ProjectPlan, SavedInquiry, StudioService } from "./types";

const defaultActiveServices = DEFAULT_STUDIO_SERVICES.filter((service) => service.active);
const defaultActivePlans = DEFAULT_PROJECT_PLANS.filter((plan) => plan.active);

let inquiriesSnapshot: SavedInquiry[] = [];
let allServicesSnapshot: StudioService[] = DEFAULT_STUDIO_SERVICES;
let activeServicesSnapshot: StudioService[] = defaultActiveServices;
let allPlansSnapshot: ProjectPlan[] = DEFAULT_PROJECT_PLANS;
let activePlansSnapshot: ProjectPlan[] = defaultActivePlans;

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

export function getAllPlansSnapshot(): ProjectPlan[] {
  return allPlansSnapshot;
}

export function setAllPlansSnapshot(next: ProjectPlan[]): ProjectPlan[] {
  allPlansSnapshot = next;
  activePlansSnapshot = next.filter((plan) => plan.active);
  return allPlansSnapshot;
}

export function getActivePlansSnapshot(): ProjectPlan[] {
  return activePlansSnapshot;
}
