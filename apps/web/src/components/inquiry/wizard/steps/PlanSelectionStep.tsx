"use client";

import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";

import { ComparePlansDialog } from "@/components/inquiry/wizard/ComparePlansDialog";
import { PlanCard } from "@/components/inquiry/wizard/PlanCard";
import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { useProjectPlans } from "@/hooks/useInquiryStorage";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";

export function PlanSelectionStep() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<InquiryWizardSchema>();

  const plans = useProjectPlans();
  const selectedPlanId = watch("planId");
  const activePlanIds = useMemo(() => new Set(plans.map((plan) => plan.id)), [plans]);

  useEffect(() => {
    if (selectedPlanId && !activePlanIds.has(selectedPlanId)) {
      setValue("planId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [activePlanIds, selectedPlanId, setValue]);

  return (
    <div className="space-y-6">
      <WizardStepHeader
        title="Select Project Plan"
        description="Choose from studio project plans managed in Owner Panel → Project Plans. All prices are in Indian Rupees (₹)."
      />

      <input type="hidden" {...register("planId")} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <ComparePlansDialog plans={plans} />
      </div>

      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          No active project plans available. Ask the owner to add plans in Project Plans management.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedPlanId === plan.id}
              onSelect={() => setValue("planId", plan.id, { shouldDirty: true, shouldValidate: true })}
            />
          ))}
        </div>
      )}

      {errors.planId ? (
        <p className="text-sm text-destructive">{errors.planId.message}</p>
      ) : null}
    </div>
  );
}
