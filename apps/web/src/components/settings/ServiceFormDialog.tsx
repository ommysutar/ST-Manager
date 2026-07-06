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
  defaultServiceFormValues,
  serviceFormSchema,
  type ServiceFormValues,
} from "@/lib/inquiry/service.schema";
import type { StudioService } from "@/lib/inquiry/types";

interface ServiceFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  service?: StudioService | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ServiceFormValues) => void;
}

export function ServiceFormDialog({
  open,
  mode,
  service,
  onOpenChange,
  onSubmit,
}: ServiceFormDialogProps) {
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: defaultServiceFormValues,
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
  const mandatory = useWatch({ control, name: "mandatory" });
  const isStudioRent = useWatch({ control, name: "isStudioRent" });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && service) {
      reset({
        name: service.name,
        priceBasic: service.prices.basic,
        priceStandard: service.prices.standard,
        pricePremium: service.prices.premium,
        category: service.category,
        description: service.description,
        active: service.active,
        mandatory: service.mandatory,
        isStudioRent: service.isStudioRent ?? false,
      });
      return;
    }

    reset(defaultServiceFormValues);
  }, [open, mode, service, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Service" : "Edit Service"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a custom studio service. It will appear in the New Inquiry Wizard when active."
              : "Update service details. Changes apply immediately across the wizard."}
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
            <Label htmlFor="service-name">Service Name *</Label>
            <Input id="service-name" placeholder="e.g. Recording" {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="service-price-basic">Basic (₹) *</Label>
              <Input
                id="service-price-basic"
                type="number"
                min={0}
                step={1}
                {...register("priceBasic", { valueAsNumber: true })}
              />
              {errors.priceBasic ? (
                <p className="text-sm text-destructive">{errors.priceBasic.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-price-standard">Standard (₹) *</Label>
              <Input
                id="service-price-standard"
                type="number"
                min={0}
                step={1}
                {...register("priceStandard", { valueAsNumber: true })}
              />
              {errors.priceStandard ? (
                <p className="text-sm text-destructive">{errors.priceStandard.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-price-premium">Premium (₹) *</Label>
              <Input
                id="service-price-premium"
                type="number"
                min={0}
                step={1}
                {...register("pricePremium", { valueAsNumber: true })}
              />
              {errors.pricePremium ? (
                <p className="text-sm text-destructive">{errors.pricePremium.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-category">Category (optional)</Label>
            <Input id="service-category" placeholder="Audio, Video, Live..." {...register("category")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-description">Description (optional)</Label>
            <Textarea
              id="service-description"
              rows={3}
              placeholder="Brief description for internal reference"
              {...register("description")}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
            <div>
              <Label htmlFor="service-studio-rent">Studio Rent (hourly rate)</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, the inquiry wizard asks for hours and calculates total automatically.
              </p>
            </div>
            <Switch
              id="service-studio-rent"
              checked={isStudioRent}
              onCheckedChange={(checked) => setValue("isStudioRent", checked, { shouldDirty: true })}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
            <div>
              <Label htmlFor="service-mandatory">Mandatory</Label>
              <p className="text-xs text-muted-foreground">
                Mandatory services are auto-included in every new inquiry.
              </p>
            </div>
            <Switch
              id="service-mandatory"
              checked={mandatory}
              disabled={!active || isStudioRent}
              onCheckedChange={(checked) => setValue("mandatory", checked, { shouldDirty: true })}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
            <div>
              <Label htmlFor="service-active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive services are hidden from the inquiry wizard.
              </p>
            </div>
            <Switch
              id="service-active"
              checked={active}
              onCheckedChange={(checked) => setValue("active", checked, { shouldDirty: true })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {mode === "create" ? "Add Service" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
