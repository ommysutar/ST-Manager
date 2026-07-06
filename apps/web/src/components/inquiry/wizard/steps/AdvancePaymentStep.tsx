"use client";

import { Badge, cn, Label } from "@st-manager/ui";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";

import { QuotationSummary } from "@/components/inquiry/wizard/QuotationSummary";
import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { ReceivePayment, type ReceivePaymentInput } from "@/components/payments/ReceivePayment";
import { useAuth } from "@/hooks/useAuth";
import { useStudioServices } from "@/hooks/useInquiryStorage";
import { useProfile } from "@/hooks/useProfile";
import { formatINR } from "@/lib/currency";
import { ADVANCE_PERCENT_OPTIONS } from "@/lib/inquiry/constants";
import { calculateAdvance, calculateQuotation } from "@/lib/inquiry/quotation";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";

export function AdvancePaymentStep() {
  const { watch, setValue } = useFormContext<InquiryWizardSchema>();
  const services = useStudioServices();
  const { user } = useAuth();
  const profile = useProfile(user);
  const values = watch();
  const quotation = useMemo(() => calculateQuotation(values, services), [values, services]);
  const advancePercent = watch("advancePercent");
  const advanceConfirmed = watch("advanceConfirmed");
  const { advanceAmount, remainingBalance } = useMemo(
    () => calculateAdvance(quotation.grandTotal, advancePercent),
    [quotation.grandTotal, advancePercent],
  );

  function handleReceive(input: ReceivePaymentInput) {
    setValue("advanceMethod", input.method, { shouldDirty: true });
    setValue("advanceNotes", input.notes, { shouldDirty: true });
    setValue("advancePercent", quotation.grandTotal > 0 ? Math.round((input.amount / quotation.grandTotal) * 100) : advancePercent, {
      shouldDirty: true,
    });
    setValue("advanceConfirmed", true, { shouldDirty: true });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <WizardStepHeader
          title="Advance Payment"
          description="Select advance percentage, then receive the advance using the same payment component used across ST Manager."
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
                onClick={() => {
                  setValue("advancePercent", percent, { shouldDirty: true });
                  setValue("advanceConfirmed", false, { shouldDirty: true });
                }}
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

        {advanceConfirmed ? (
          <Badge variant="success">Advance payment recorded — will be saved when the project is created</Badge>
        ) : (
          <ReceivePayment
            amountDue={advanceAmount}
            defaultAmount={advanceAmount}
            qrDataUrl={profile?.upiQrDataUrl}
            upiId={profile?.upiId}
            onReceive={handleReceive}
          />
        )}
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
