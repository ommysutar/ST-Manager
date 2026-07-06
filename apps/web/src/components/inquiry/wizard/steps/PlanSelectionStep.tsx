"use client";

import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";

import { ComparePlansDialog } from "@/components/inquiry/wizard/ComparePlansDialog";
import { PlanCard } from "@/components/inquiry/wizard/PlanCard";
import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { useProjectPlans } from "@/hooks/useInquiryStorage";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";

export function PlanSelectionStep() {
  const { watch, setValue } = useFormContext<InquiryWizardSchema>();

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
        title="Compare Project Plans"
        description="Review studio plans for client comparison only. Plan prices are not added to the quotation."
      />

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

      <p className="text-sm text-muted-foreground">
        {selectedPlanId
          ? "Selected plan is noted for reference and does not affect quotation totals."
          : "Optional: select a plan to highlight it for the client. You can continue without selecting one."}
      </p>
    </div>
  );
}
