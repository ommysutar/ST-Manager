import { getTotalExpenses } from "./expenses";
import type { ProjectProfit, StudioProject } from "./types";

/**
 * Revenue − Expenses = Net Profit. Owner-only figure — callers must gate visibility on
 * `user?.role === "owner"` before rendering; this function performs no access control itself.
 */
export function calculateProjectProfit(project: StudioProject): ProjectProfit {
  const revenue = project.grandTotal;
  const totalExpenses = getTotalExpenses(project);

  return {
    revenue,
    totalExpenses,
    netProfit: revenue - totalExpenses,
  };
}
