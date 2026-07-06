import { generateId } from "@/lib/inquiry/services";

import { getProject, updateProject } from "./storage";
import type { ProjectExpense, StudioProject } from "./types";

export interface ExpenseInput {
  name: string;
  category: string;
  amount: number;
  assignedPerson: string;
  notes: string;
  expenseDate: string;
}

/** Internal-only cost tracking against a project. Never surfaced on client-facing quotations/invoices. */
export function addProjectExpense(projectId: string, input: ExpenseInput): StudioProject | null {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  const expense: ProjectExpense = {
    id: generateId("exp"),
    name: input.name.trim(),
    category: input.category.trim() || "Other",
    amount: Math.max(0, Math.round(input.amount)),
    assignedPerson: input.assignedPerson.trim(),
    notes: input.notes.trim(),
    expenseDate: input.expenseDate || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };

  return updateProject(projectId, { expenses: [expense, ...project.expenses] });
}

export function updateProjectExpense(
  projectId: string,
  expenseId: string,
  patch: Partial<ExpenseInput>,
): StudioProject | null {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  const expenses = project.expenses.map((expense) =>
    expense.id === expenseId
      ? {
          ...expense,
          ...patch,
          amount: patch.amount !== undefined ? Math.max(0, Math.round(patch.amount)) : expense.amount,
        }
      : expense,
  );

  return updateProject(projectId, { expenses });
}

export function removeProjectExpense(projectId: string, expenseId: string): StudioProject | null {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  return updateProject(projectId, {
    expenses: project.expenses.filter((expense) => expense.id !== expenseId),
  });
}

export function getTotalExpenses(project: StudioProject): number {
  return project.expenses.reduce((sum, expense) => sum + expense.amount, 0);
}
