export interface PortalEstimateInput {
  estimatedCompletionDate: string | null;
  scheduleStatus: "on_schedule" | "delayed" | "unknown";
  expectedCompletionDate: string | null;
  delayReason: string | null;
}

export interface PortalProjectSettings {
  studioMessage: string | null;
  estimate: PortalEstimateInput;
}

const SETTINGS_PREFIX = "st-manager-client-portal-settings:";

const DEFAULT_ESTIMATE: PortalEstimateInput = {
  estimatedCompletionDate: null,
  scheduleStatus: "on_schedule",
  expectedCompletionDate: null,
  delayReason: null,
};

export function loadPortalSettings(projectId: string): PortalProjectSettings {
  if (typeof window === "undefined") {
    return { studioMessage: null, estimate: { ...DEFAULT_ESTIMATE } };
  }
  try {
    const raw = localStorage.getItem(`${SETTINGS_PREFIX}${projectId}`);
    if (!raw) {
      return { studioMessage: null, estimate: { ...DEFAULT_ESTIMATE } };
    }
    const parsed = JSON.parse(raw) as Partial<PortalProjectSettings>;
    return {
      studioMessage: parsed.studioMessage?.trim() || null,
      estimate: {
        estimatedCompletionDate: parsed.estimate?.estimatedCompletionDate ?? null,
        scheduleStatus: parsed.estimate?.scheduleStatus ?? "on_schedule",
        expectedCompletionDate: parsed.estimate?.expectedCompletionDate ?? null,
        delayReason: parsed.estimate?.delayReason ?? null,
      },
    };
  } catch {
    return { studioMessage: null, estimate: { ...DEFAULT_ESTIMATE } };
  }
}

export function savePortalSettings(projectId: string, settings: PortalProjectSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${SETTINGS_PREFIX}${projectId}`,
    JSON.stringify({
      studioMessage: settings.studioMessage?.trim() || null,
      estimate: settings.estimate,
    }),
  );
}
