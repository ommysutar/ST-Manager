"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from "@st-manager/ui";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  defaultProjectPlanFormValues,
  featuresToText,
  projectPlanFormSchema,
  textToFeatures,
  type ProjectPlanFormValues,
} from "@/lib/inquiry/plan.schema";
import type { ProjectPlan } from "@/lib/inquiry/types";

interface ProjectPlanFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  plan?: ProjectPlan | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectPlanFormValues) => void;
}

export function ProjectPlanFormDialog({
  open,
  mode,
  plan,
  onOpenChange,
  onSubmit,
}: ProjectPlanFormDialogProps) {
  const form = useForm<ProjectPlanFormValues>({
    resolver: zodResolver(projectPlanFormSchema),
    defaultValues: defaultProjectPlanFormValues,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = form;

  const active = useWatch({ control, name: "active" });
  const highlighted = useWatch({ control, name: "highlighted" });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && plan) {
      reset({
        name: plan.name,
        price: plan.price,
        featuresText: featuresToText(plan.features),
        highlighted: plan.highlighted ?? false,
        active: plan.active,
      });
      return;
    }

    reset(defaultProjectPlanFormValues);
  }, [open, mode, plan, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Project Plan" : "Edit Project Plan"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a project plan for the New Inquiry Wizard."
              : "Update plan details. Changes apply immediately in the inquiry wizard."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => {
            onSubmit(values);
            onOpenChange(false);
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name *</Label>
            <Input id="plan-name" placeholder="e.g. Standard" {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-price">Price (₹) *</Label>
            <Input
              id="plan-price"
              type="number"
              min={0}
              step={1}
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price ? (
              <p className="text-sm text-destructive">{errors.price.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-features">Features (one per line) *</Label>
            <Textarea id="plan-features" rows={5} {...register("featuresText")} />
            {errors.featuresText ? (
              <p className="text-sm text-destructive">{errors.featuresText.message}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
            <div>
              <Label htmlFor="plan-highlighted">Highlight plan</Label>
              <p className="text-xs text-muted-foreground">Shown as recommended in the wizard.</p>
            </div>
            <Switch
              id="plan-highlighted"
              checked={highlighted}
              onCheckedChange={(checked) => setValue("highlighted", checked, { shouldDirty: true })}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
            <div>
              <Label htmlFor="plan-active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive plans are hidden from the inquiry wizard.
              </p>
            </div>
            <Switch
              id="plan-active"
              checked={active}
              onCheckedChange={(checked) => setValue("active", checked, { shouldDirty: true })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {mode === "create" ? "Add Plan" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
