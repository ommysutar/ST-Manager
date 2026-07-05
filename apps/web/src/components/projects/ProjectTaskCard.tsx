"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Textarea,
} from "@st-manager/ui";
import { Trash2Icon } from "lucide-react";

import type { ProjectTask } from "@/lib/projects/types";

interface ProjectTaskCardProps {
  task: ProjectTask;
  isCurrent: boolean;
  onUpdate: (patch: Partial<ProjectTask>) => void;
  onDelete: () => void;
}

export function ProjectTaskCard({ task, isCurrent, onUpdate, onDelete }: ProjectTaskCardProps) {
  const statusLabel = task.completed
    ? "Completed"
    : isCurrent
      ? "In Progress"
      : task.status === "in_progress"
        ? "In Progress"
        : "Pending";

  const statusVariant = task.completed ? "success" : isCurrent ? "secondary" : "secondary";

  return (
    <Card
      className={
        task.completed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isCurrent
            ? "border-primary/40"
            : "border-border/60"
      }
    >
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={task.completed}
              onCheckedChange={(checked) =>
                onUpdate({
                  completed: Boolean(checked),
                  status: checked ? "completed" : "pending",
                })
              }
              aria-label={`Mark ${task.name} complete`}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{task.name}</p>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
                {task.isCustom ? <Badge variant="outline">Custom</Badge> : null}
              </div>
            </div>
          </div>

          {task.isCustom ? (
            <Button type="button" variant="ghost" size="icon" onClick={onDelete}>
              <Trash2Icon className="size-4 text-destructive" />
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Assigned Engineer</Label>
            <Input
              value={task.assignedEngineer}
              onChange={(event) => onUpdate({ assignedEngineer: event.target.value })}
              placeholder="Engineer name"
            />
          </div>
          <div className="space-y-2">
            <Label>Estimated Duration (minutes)</Label>
            <Input
              type="number"
              min={15}
              value={task.estimatedDurationMinutes}
              onChange={(event) =>
                onUpdate({ estimatedDurationMinutes: Number(event.target.value) || 15 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Due Date (optional)</Label>
            <Input
              type="date"
              value={task.dueDate ?? ""}
              onChange={(event) => onUpdate({ dueDate: event.target.value || undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label>Actual Time (future)</Label>
            <Input disabled placeholder="Coming soon" value="" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={task.notes}
            onChange={(event) => onUpdate({ notes: event.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
