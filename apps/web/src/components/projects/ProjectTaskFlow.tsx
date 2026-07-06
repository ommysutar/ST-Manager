"use client";

import { cn, Progress } from "@st-manager/ui";
import { GripVerticalIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { calculateProjectProgress, getCurrentTaskIndex } from "@/lib/projects/progress";
import {
  createCustomTask,
  deleteTaskFromList,
  duplicateTaskInList,
  reorderTasks,
  sortTasks,
  updateTaskInList,
} from "@/lib/projects/tasks";
import { evaluateProjectCompletion, updateProjectTasks } from "@/lib/projects/storage";
import type { ProjectTask, StudioProject } from "@/lib/projects/types";

import { AddTaskDialog } from "./AddTaskDialog";
import { ProjectTaskCard } from "./ProjectTaskCard";

interface ProjectTaskFlowProps {
  project: StudioProject;
}

export function ProjectTaskFlow({ project }: ProjectTaskFlowProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const tasks = useMemo(() => sortTasks(project.tasks), [project.tasks]);
  const progress = calculateProjectProgress(project);
  const currentIndex = getCurrentTaskIndex(tasks);

  function persistTasks(nextTasks: ProjectTask[]) {
    updateProjectTasks(project.id, nextTasks);
    evaluateProjectCompletion(project.id);
  }

  function handleTaskUpdate(taskId: string, patch: Partial<ProjectTask>) {
    persistTasks(updateTaskInList(tasks, taskId, patch));
  }

  function handleAddTask(name: string) {
    persistTasks([...tasks, createCustomTask(name, tasks, project.assignedEngineer)]);
  }

  function handleDeleteTask(taskId: string) {
    persistTasks(deleteTaskFromList(tasks, taskId));
  }

  function handleDuplicateTask(taskId: string) {
    persistTasks(duplicateTaskInList(tasks, taskId));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }

    persistTasks(reorderTasks(tasks, dragIndex, targetIndex));
    setDragIndex(null);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>
            {progress.completedCount} / {progress.totalCount} Tasks
          </span>
          <span className="font-medium">{progress.percent}%</span>
        </div>
        <Progress value={progress.percent} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Task Flow</h2>
        <AddTaskDialog onAdd={handleAddTask} />
      </div>

      <div className="space-y-0">
        {tasks.map((task, index) => (
          <div key={task.id}>
            <div
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(index)}
              className={cn(
                "flex gap-2 rounded-lg border border-transparent p-1 transition-colors",
                dragIndex === index && "border-primary/40 bg-primary/5",
                index === currentIndex && !task.completed && "border-primary/30 bg-primary/5",
              )}
            >
              <button
                type="button"
                className="mt-4 cursor-grab text-muted-foreground active:cursor-grabbing"
                aria-label="Drag to reorder"
              >
                <GripVerticalIcon className="size-4" />
              </button>

              <div className="flex-1">
                <ProjectTaskCard
                  task={task}
                  isCurrent={index === currentIndex && !task.completed}
                  onUpdate={(patch) => handleTaskUpdate(task.id, patch)}
                  onDelete={() => handleDeleteTask(task.id)}
                  onDuplicate={() => handleDuplicateTask(task.id)}
                />
              </div>
            </div>

            {index < tasks.length - 1 ? (
              <div className="ml-6 py-1 text-center text-muted-foreground">↓</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
