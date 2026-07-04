"use client";

import { cn, Checkbox, Label } from "@st-manager/ui";
import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";

import { QuotationSummary } from "@/components/inquiry/wizard/QuotationSummary";
import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { useProjectPlans, useStudioServices } from "@/hooks/useInquiryStorage";
import { formatINR } from "@/lib/currency";
import { STUDIO_DISCOUNT_OPTIONS } from "@/lib/inquiry/constants";
import { calculateQuotation } from "@/lib/inquiry/quotation";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";

export function ServicesSelectionStep() {
  const { watch, setValue } = useFormContext<InquiryWizardSchema>();
  const services = useStudioServices();
  const plans = useProjectPlans();
  const selectedServiceIds = watch("selectedServiceIds");
  const studioDiscountPercent = watch("studioDiscountPercent");
  const planId = watch("planId");

  const activeServiceIds = useMemo(() => new Set(services.map((service) => service.id)), [services]);

  useEffect(() => {
    const validSelection = selectedServiceIds.filter((id) => activeServiceIds.has(id));
    if (validSelection.length !== selectedServiceIds.length) {
      setValue("selectedServiceIds", validSelection, { shouldDirty: true });
    }
  }, [activeServiceIds, selectedServiceIds, setValue]);

  const quotation = useMemo(
    () =>
      calculateQuotation(
        {
          planId,
          selectedServiceIds: selectedServiceIds.filter((id) => activeServiceIds.has(id)),
          studioDiscountPercent,
        },
        services,
        plans,
      ),
    [planId, selectedServiceIds, studioDiscountPercent, services, activeServiceIds, plans],
  );

  function toggleService(serviceId: string) {
    const next = selectedServiceIds.includes(serviceId)
      ? selectedServiceIds.filter((id) => id !== serviceId)
      : [...selectedServiceIds, serviceId];

    setValue("selectedServiceIds", next, { shouldDirty: true });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <WizardStepHeader
          title="Choose Services"
          description="Select studio services. Prices are read-only here and managed from Owner Panel → Service Management."
        />

        {services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            No active services available. Ask the owner to add services in Service Management.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((service) => {
              const checked = selectedServiceIds.includes(service.id);

              return (
                <label
                  key={service.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/50 p-4 backdrop-blur-md transition-all duration-200 hover:border-primary/30 dark:bg-background/30",
                    checked && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleService(service.id)} />
                  <span className="flex-1">
                    <span className="block font-medium">{service.name}</span>
                    {service.category ? (
                      <span className="text-xs text-muted-foreground">{service.category}</span>
                    ) : null}
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {formatINR(service.price)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4 backdrop-blur-md">
          <Label>Studio Discount (%)</Label>
          <div className="flex flex-wrap gap-2">
            {STUDIO_DISCOUNT_OPTIONS.map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() =>
                  setValue("studioDiscountPercent", percent, { shouldDirty: true })
                }
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                  studioDiscountPercent === percent
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

      <QuotationSummary quotation={quotation} discountPercent={studioDiscountPercent} />
    </div>
  );
}
