import { loadAllStudioServices } from "@/lib/inquiry/services";
import { generateId } from "@/lib/inquiry/services";

import {
  DEFAULT_ESTIMATED_MINUTES,
  FINAL_DELIVERY_TASK_NAME,
  MANDATORY_TASK_DEFINITIONS,
  SERVICE_TASK_TEMPLATES,
} from "./constants";
import type { ProjectTask } from "./types";

function createTask(
  name: string,
  sortOrder: number,
  options: Partial<ProjectTask> = {},
): ProjectTask {
  return {
    id: generateId("task"),
    name,
    serviceId: options.serviceId,
    isCustom: options.isCustom ?? false,
    mandatoryKey: options.mandatoryKey,
    assignedEngineer: options.assignedEngineer ?? "",
    estimatedDurationMinutes: options.estimatedDurationMinutes ?? DEFAULT_ESTIMATED_MINUTES,
    notes: options.notes ?? "",
    status: "pending",
    completed: false,
    completedDate: undefined,
    dueDate: options.dueDate,
    sortOrder,
  };
}

/** True for any task the user is allowed to remove — every task except the three mandatory ones. */
export function isTaskDeletable(task: ProjectTask): boolean {
  return !task.mandatoryKey;
}

/**
 * Guarantees the three mandatory tasks (Payment, Files Shared, Project Delivery) exist, in that
 * relative order at the end of the flow. Idempotent — safe to call on every project load. Migrates
 * the legacy "Final Delivery" auto-task into the "project_delivery" mandatory task in place so
 * existing progress/completion state is preserved.
 */
export function ensureMandatoryTasks(tasks: ProjectTask[], assignedEngineer = ""): ProjectTask[] {
  const result = [...tasks];
  const existingKeys = new Set(result.map((task) => task.mandatoryKey).filter(Boolean));

  const legacyDeliveryIndex = result.findIndex(
    (task) => !task.isCustom && !task.mandatoryKey && task.name === FINAL_DELIVERY_TASK_NAME,
  );
  if (legacyDeliveryIndex !== -1 && !existingKeys.has("project_delivery")) {
    result[legacyDeliveryIndex] = {
      ...result[legacyDeliveryIndex],
      name: "Project Delivery",
      mandatoryKey: "project_delivery",
    };
    existingKeys.add("project_delivery");
  }

  let maxOrder = result.reduce((max, task) => Math.max(max, task.sortOrder), -1);

  for (const definition of MANDATORY_TASK_DEFINITIONS) {
    if (existingKeys.has(definition.key)) {
      continue;
    }
    maxOrder += 1;
    result.push(
      createTask(definition.name, maxOrder, {
        assignedEngineer,
        mandatoryKey: definition.key,
        estimatedDurationMinutes: definition.key === "project_delivery" ? 60 : 30,
      }),
    );
  }

  return result;
}

export function generateTasksFromServices(
  selectedServiceIds: string[],
  assignedEngineer = "",
): ProjectTask[] {
  const services = loadAllStudioServices();
  const tasks: ProjectTask[] = [];
  let sortOrder = 0;

  for (const serviceId of selectedServiceIds) {
    const service = services.find((entry) => entry.id === serviceId);
    const templateNames = SERVICE_TASK_TEMPLATES[serviceId] ?? [service?.name ?? "Service Task"];

    for (const taskName of templateNames) {
      tasks.push(
        createTask(taskName, sortOrder, {
          serviceId,
          assignedEngineer,
        }),
      );
      sortOrder += 1;
    }
  }

  return ensureMandatoryTasks(tasks, assignedEngineer);
}

export function createCustomTask(
  name: string,
  existingTasks: ProjectTask[],
  assignedEngineer = "",
): ProjectTask {
  const maxOrder = existingTasks.reduce((max, task) => Math.max(max, task.sortOrder), -1);
  return createTask(name.trim(), maxOrder + 1, {
    isCustom: true,
    assignedEngineer,
  });
}

/** Creates a copy of an existing task (never copies a mandatory key — duplicates are always regular tasks). */
export function duplicateTaskInList(tasks: ProjectTask[], taskId: string): ProjectTask[] {
  const source = tasks.find((task) => task.id === taskId);
  if (!source) {
    return tasks;
  }

  const duplicate: ProjectTask = {
    ...source,
    id: generateId("task"),
    name: `${source.name} (Copy)`,
    isCustom: true,
    mandatoryKey: undefined,
    completed: false,
    completedDate: undefined,
    status: "pending",
    sortOrder: source.sortOrder + 0.5,
  };

  return [...tasks, duplicate]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((task, index) => ({ ...task, sortOrder: index }));
}

export function reorderTasks(tasks: ProjectTask[], fromIndex: number, toIndex: number): ProjectTask[] {
  const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
  if (fromIndex < 0 || fromIndex >= sorted.length || toIndex < 0 || toIndex >= sorted.length) {
    return tasks;
  }

  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, moved);

  return sorted.map((task, index) => ({ ...task, sortOrder: index }));
}

export function updateTaskInList(
  tasks: ProjectTask[],
  taskId: string,
  patch: Partial<ProjectTask>,
): ProjectTask[] {
  return tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    const completed = patch.completed ?? task.completed;
    const status =
      patch.status ??
      (completed ? "completed" : task.status === "completed" ? "pending" : task.status);
    const wasCompleted = task.completed;

    return {
      ...task,
      ...patch,
      completed,
      status: completed ? "completed" : status === "completed" ? "pending" : status,
      completedDate: completed
        ? (patch.completedDate ?? (wasCompleted ? task.completedDate : new Date().toISOString()))
        : undefined,
    };
  });
}

/** Removes a task. Mandatory tasks (Payment, Files Shared, Project Delivery) are never removed. */
export function deleteTaskFromList(tasks: ProjectTask[], taskId: string): ProjectTask[] {
  return tasks
    .filter((task) => task.id !== taskId || !isTaskDeletable(task))
    .map((task, index) => ({ ...task, sortOrder: index }));
}

export function sortTasks(tasks: ProjectTask[]): ProjectTask[] {
  return [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
}
