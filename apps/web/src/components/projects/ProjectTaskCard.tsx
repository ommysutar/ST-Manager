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
import { CopyIcon, LockIcon, Trash2Icon } from "lucide-react";

import type { ProjectTask } from "@/lib/projects/types";
import type { WhatsAppMessageVariables, WhatsAppNotificationType } from "@/lib/whatsapp/types";

import { WhatsAppNotifyIcon } from "@/components/whatsapp/WhatsAppNotifyIcon";

interface ProjectTaskCardProps {
  task: ProjectTask;
  isCurrent: boolean;
  onUpdate: (patch: Partial<ProjectTask>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  whatsappNumber?: string | null;
  whatsappType?: WhatsAppNotificationType;
  whatsappVariables?: WhatsAppMessageVariables;
}

function formatCompletedDate(value?: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProjectTaskCard({
  task,
  isCurrent,
  onUpdate,
  onDelete,
  onDuplicate,
  whatsappNumber,
  whatsappType = "files_shared",
  whatsappVariables = {},
}: ProjectTaskCardProps) {
  const statusLabel = task.completed
    ? "Completed"
    : isCurrent
      ? "In Progress"
      : task.status === "in_progress"
        ? "In Progress"
        : "Pending";

  const statusVariant = task.completed ? "success" : isCurrent ? "secondary" : "secondary";
  const isMandatory = Boolean(task.mandatoryKey);
  const isPaymentTask = task.mandatoryKey === "payment";
  const completedDateLabel = formatCompletedDate(task.completedDate);

  return (
    <Card
      className={
        task.completed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isCurrent
            ? "border-primary/40 bg-primary/5"
            : "border-border/50 bg-muted/20 opacity-80"
      }
    >
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={task.completed}
              disabled={isPaymentTask}
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
                {isMandatory ? (
                  <Badge variant="outline" className="gap-1">
                    <LockIcon className="size-3" />
                    Mandatory
                  </Badge>
                ) : null}
              </div>
              {completedDateLabel ? (
                <p className="mt-1 text-xs text-muted-foreground">Completed {completedDateLabel}</p>
              ) : null}
              {isPaymentTask ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Synced automatically from the Payments tab — cannot be toggled manually.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {task.mandatoryKey === "files_shared" && whatsappNumber !== undefined ? (
              <WhatsAppNotifyIcon
                whatsappNumber={whatsappNumber}
                type={whatsappType}
                variables={whatsappVariables}
                size="sm"
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDuplicate}
              aria-label={`Duplicate ${task.name}`}
              title="Duplicate task"
            >
              <CopyIcon className="size-4" />
            </Button>
            {!isMandatory ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onDelete}
                aria-label={`Delete ${task.name}`}
                title="Delete task"
              >
                <Trash2Icon className="size-4 text-destructive" />
              </Button>
            ) : null}
          </div>
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
            <Label>Estimated Time (minutes)</Label>
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
