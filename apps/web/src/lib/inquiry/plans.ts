import { DEFAULT_PROJECT_PLANS } from "./constants";
import { notifyProjectPlansUpdated } from "./events";
import { generateId } from "./services";
import { setAllPlansSnapshot } from "./snapshots";
import type { ProjectPlan } from "./types";
import { PROJECT_PLANS_STORAGE_KEY } from "./types";

function normalizePlan(raw: Partial<ProjectPlan> & { id: string }): ProjectPlan {
  const features = Array.isArray(raw.features)
    ? raw.features.map((feature) => feature.trim()).filter(Boolean)
    : [];

  return {
    id: raw.id,
    name: raw.name?.trim() || "Untitled Plan",
    price: Number.isFinite(raw.price) ? Math.max(0, Math.round(raw.price!)) : 0,
    features,
    highlighted: raw.highlighted ?? false,
    active: raw.active ?? true,
  };
}

function readPlansFromStorage(): ProjectPlan[] {
  if (typeof window === "undefined") {
    return DEFAULT_PROJECT_PLANS;
  }

  try {
    const raw = localStorage.getItem(PROJECT_PLANS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROJECT_PLANS;
    }

    const parsed = JSON.parse(raw) as Partial<ProjectPlan>[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_PROJECT_PLANS;
    }

    return parsed.map((plan) => normalizePlan(plan as ProjectPlan));
  } catch {
    return DEFAULT_PROJECT_PLANS;
  }
}

export function loadAllProjectPlans(): ProjectPlan[] {
  return readPlansFromStorage();
}

export function getActiveProjectPlans(): ProjectPlan[] {
  return loadAllProjectPlans().filter((plan) => plan.active);
}

export function getPlanById(planId: string): ProjectPlan | undefined {
  return loadAllProjectPlans().find((plan) => plan.id === planId);
}

export function persistProjectPlans(plans: ProjectPlan[]): ProjectPlan[] {
  const normalized = plans.map((plan) => normalizePlan(plan));
  localStorage.setItem(PROJECT_PLANS_STORAGE_KEY, JSON.stringify(normalized));
  setAllPlansSnapshot(normalized);
  notifyProjectPlansUpdated();
  return normalized;
}

export function createProjectPlan(input: Omit<ProjectPlan, "id">): ProjectPlan {
  const plan = normalizePlan({
    id: generateId("plan"),
    ...input,
  });
  persistProjectPlans([plan, ...loadAllProjectPlans()]);
  return plan;
}

export function updateProjectPlan(
  id: string,
  input: Partial<Omit<ProjectPlan, "id">>,
): ProjectPlan | null {
  const plans = loadAllProjectPlans();
  const index = plans.findIndex((plan) => plan.id === id);
  if (index === -1) {
    return null;
  }

  const updated = normalizePlan({ ...plans[index], ...input, id });
  plans[index] = updated;
  persistProjectPlans(plans);
  return updated;
}

export function deleteProjectPlan(id: string): boolean {
  const plans = loadAllProjectPlans();
  const next = plans.filter((plan) => plan.id !== id);
  if (next.length === plans.length) {
    return false;
  }

  persistProjectPlans(next);
  return true;
}

export function resetProjectPlansToDefaults(): ProjectPlan[] {
  return persistProjectPlans(DEFAULT_PROJECT_PLANS);
}

export type PlanSortField = "name" | "price";
export type PlanSortDirection = "asc" | "desc";

export function sortProjectPlans(
  plans: ProjectPlan[],
  field: PlanSortField,
  direction: PlanSortDirection,
): ProjectPlan[] {
  const sorted = [...plans].sort((a, b) => {
    if (field === "price") {
      return a.price - b.price;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return direction === "desc" ? sorted.reverse() : sorted;
}

export function filterProjectPlans(plans: ProjectPlan[], query: string): ProjectPlan[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return plans;
  }

  return plans.filter(
    (plan) =>
      plan.name.toLowerCase().includes(normalized) ||
      plan.features.some((feature) => feature.toLowerCase().includes(normalized)),
  );
}

export function initializeProjectPlanSnapshots(): void {
  setAllPlansSnapshot(readPlansFromStorage());
}
