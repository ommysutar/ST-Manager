import { getDefaultStudioServices } from "@/lib/demo-data";

import type { StudioService } from "./types";

export const STUDIO_RENT_SERVICE_ID = "studio_rent";

export const DEFAULT_STUDIO_SERVICES: StudioService[] = getDefaultStudioServices();

export const ADVANCE_PERCENT_OPTIONS = [10, 20, 30, 50] as const;

export const PROJECT_CATEGORIES = ["Audio", "Video", "Image"] as const;

export const WIZARD_STEPS = [
  { id: 1, label: "Client Details", shortLabel: "Client" },
  { id: 2, label: "Project Details", shortLabel: "Project" },
  { id: 3, label: "Services", shortLabel: "Services" },
  { id: 4, label: "Decision", shortLabel: "Decision" },
  { id: 5, label: "Advance Payment", shortLabel: "Payment" },
] as const;
