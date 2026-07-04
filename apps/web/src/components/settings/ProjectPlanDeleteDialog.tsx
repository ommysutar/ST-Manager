"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@st-manager/ui";

import { formatINR } from "@/lib/currency";
import type { ProjectPlan } from "@/lib/inquiry/types";

interface ProjectPlanDeleteDialogProps {
  open: boolean;
  plan: ProjectPlan | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ProjectPlanDeleteDialog({
  open,
  plan,
  onOpenChange,
  onConfirm,
}: ProjectPlanDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete project plan?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The plan will be removed from Project Plans management
            and will no longer appear in the New Inquiry Wizard.
          </DialogDescription>
        </DialogHeader>

        {plan ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <p className="font-medium">{plan.name}</p>
            <p className="text-muted-foreground">{formatINR(plan.price)}</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Delete Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
