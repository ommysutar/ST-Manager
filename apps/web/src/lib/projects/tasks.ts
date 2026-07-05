import { loadAllStudioServices } from "@/lib/inquiry/services";
import { generateId } from "@/lib/inquiry/services";

import {
  DEFAULT_ESTIMATED_MINUTES,
  FINAL_DELIVERY_TASK_NAME,
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
    assignedEngineer: options.assignedEngineer ?? "",
    estimatedDurationMinutes: options.estimatedDurationMinutes ?? DEFAULT_ESTIMATED_MINUTES,
    notes: options.notes ?? "",
    status: "pending",
    completed: false,
    dueDate: options.dueDate,
    sortOrder,
  };
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

  tasks.push(
    createTask(FINAL_DELIVERY_TASK_NAME, sortOrder, {
      assignedEngineer,
      estimatedDurationMinutes: 60,
    }),
  );

  return tasks;
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

    return {
      ...task,
      ...patch,
      completed,
      status: completed ? "completed" : status === "completed" ? "pending" : status,
    };
  });
}

export function deleteTaskFromList(tasks: ProjectTask[], taskId: string): ProjectTask[] {
  return tasks
    .filter((task) => task.id !== taskId)
    .map((task, index) => ({ ...task, sortOrder: index }));
}

export function sortTasks(tasks: ProjectTask[]): ProjectTask[] {
  return [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
}
