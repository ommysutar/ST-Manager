"use client";

import { cn, Label } from "@st-manager/ui";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";

import { QuotationSummary } from "@/components/inquiry/wizard/QuotationSummary";
import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { formatINR } from "@/lib/currency";
import { ADVANCE_PERCENT_OPTIONS } from "@/lib/inquiry/constants";
import { calculateAdvance, calculateQuotation } from "@/lib/inquiry/quotation";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";

export function AdvancePaymentStep() {
  const { watch, setValue } = useFormContext<InquiryWizardSchema>();
  const values = watch();
  const quotation = useMemo(() => calculateQuotation(values), [values]);
  const advancePercent = watch("advancePercent");
  const { advanceAmount, remainingBalance } = useMemo(
    () => calculateAdvance(quotation.grandTotal, advancePercent),
    [quotation.grandTotal, advancePercent],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <WizardStepHeader
          title="Advance Payment"
          description="Select advance percentage. Advance amount and remaining balance update automatically."
        />

        <QuotationSummary
          quotation={quotation}
          discountPercent={values.studioDiscountPercent}
          compact
        />

        <div className="space-y-3">
          <Label>Advance Percentage</Label>
          <div className="flex flex-wrap gap-2">
            {ADVANCE_PERCENT_OPTIONS.map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() => setValue("advancePercent", percent, { shouldDirty: true })}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                  advancePercent === percent
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:border-primary/30",
                )}
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-6 shadow-lg backdrop-blur-md dark:bg-background/30">
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Project Total</span>
          <span className="font-semibold">{formatINR(quotation.grandTotal)}</span>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Advance ({advancePercent}%)</span>
          <span className="font-medium">{formatINR(advanceAmount)}</span>
        </div>
        <div className="rounded-xl bg-primary/5 p-4">
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-medium">Advance Amount</span>
            <span className="font-semibold text-primary">{formatINR(advanceAmount)}</span>
          </div>
          <div className="mt-3 flex justify-between gap-4 border-t border-border/60 pt-3 text-sm">
            <span className="font-medium">Remaining Balance</span>
            <span className="font-semibold">{formatINR(remainingBalance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
