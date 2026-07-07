"use client";

import { Badge, Button, cn, Checkbox, Input, Label } from "@st-manager/ui";
import { PlusIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

import { QuotationSummary } from "@/components/inquiry/wizard/QuotationSummary";
import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { useStudioServices } from "@/hooks/useInquiryStorage";
import { formatINR } from "@/lib/currency";
import { calculateQuotation } from "@/lib/inquiry/quotation";
import { generateId, getServicePrice } from "@/lib/inquiry/services";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";
import type { DiscountType, ServicePricingTier } from "@/lib/inquiry/types";

const PRICING_TIERS: { id: ServicePricingTier; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "standard", label: "Standard" },
  { id: "premium", label: "Premium" },
];

const DISCOUNT_TYPES: { id: DiscountType; label: string }[] = [
  { id: "amount", label: "₹ Amount" },
  { id: "percent", label: "Percentage %" },
];

export function ServicesSelectionStep() {
  const { watch, setValue } = useFormContext<InquiryWizardSchema>();
  const services = useStudioServices();
  const selectedServiceIds = watch("selectedServiceIds");
  const servicePricingTier = watch("servicePricingTier");
  const studioDiscountType = watch("studioDiscountType");
  const studioDiscountPercent = watch("studioDiscountPercent");
  const studioDiscountAmount = watch("studioDiscountAmount");
  const customServices = watch("customServices");
  const serviceHours = watch("serviceHours") ?? {};

  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const catalogServices = useMemo(() => services, [services]);

  const activeServiceIds = useMemo(
    () => new Set(catalogServices.map((service) => service.id)),
    [catalogServices],
  );
  const mandatoryIds = useMemo(
    () => new Set(catalogServices.filter((service) => service.mandatory).map((service) => service.id)),
    [catalogServices],
  );

  useEffect(() => {
    const validSelection = selectedServiceIds.filter((id) => activeServiceIds.has(id));
    const withMandatory = Array.from(new Set([...validSelection, ...mandatoryIds]));
    if (withMandatory.length !== selectedServiceIds.length) {
      setValue("selectedServiceIds", withMandatory, { shouldDirty: true });
    }
  }, [activeServiceIds, mandatoryIds, selectedServiceIds, setValue]);

  const quotation = useMemo(
    () =>
      calculateQuotation(
        {
          selectedServiceIds: selectedServiceIds.filter((id) => activeServiceIds.has(id)),
          servicePricingTier,
          customServices,
          serviceHours,
          studioRentHours: 0,
          studioDiscountType,
          studioDiscountPercent,
          studioDiscountAmount,
        },
        services,
      ),
    [
      selectedServiceIds,
      servicePricingTier,
      customServices,
      serviceHours,
      studioDiscountType,
      studioDiscountPercent,
      studioDiscountAmount,
      services,
      activeServiceIds,
    ],
  );

  function toggleService(serviceId: string) {
    if (mandatoryIds.has(serviceId)) {
      return;
    }

    const next = selectedServiceIds.includes(serviceId)
      ? selectedServiceIds.filter((id) => id !== serviceId)
      : [...selectedServiceIds, serviceId];

    setValue("selectedServiceIds", next, { shouldDirty: true });
  }

  function setServiceHours(serviceId: string, rawValue: string) {
    const parsed = rawValue.trim() === "" ? 0 : Number.parseFloat(rawValue);
    const hours = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setValue(
      "serviceHours",
      { ...serviceHours, [serviceId]: hours },
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function addCustomService() {
    const name = customName.trim();
    const price = Number(customPrice);
    if (!name || !Number.isFinite(price) || price < 0) {
      return;
    }

    setValue(
      "customServices",
      [...customServices, { id: generateId("cst"), name, price: Math.round(price) }],
      { shouldDirty: true },
    );
    setCustomName("");
    setCustomPrice("");
  }

  function removeCustomService(id: string) {
    setValue(
      "customServices",
      customServices.filter((service) => service.id !== id),
      { shouldDirty: true },
    );
  }

  if (catalogServices.length === 0) {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-8 text-center">
          <SettingsIcon className="mx-auto mb-4 size-10 text-amber-600 dark:text-amber-400" />
          <p className="text-base font-medium text-foreground">
            Please create at least one Service in Settings before creating an Inquiry.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Studio services define pricing tiers and task workflows for every inquiry and project.
          </p>
          <Button asChild className="mt-6">
            <Link href="/settings/services">Go to Service Settings</Link>
          </Button>
        </div>
        <QuotationSummary
          quotation={quotation}
          discountType={studioDiscountType}
          discountPercent={studioDiscountPercent}
          discountAmountInput={studioDiscountAmount}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <WizardStepHeader
          title="Choose Services"
          description="Select services using Basic, Standard, or Premium pricing. Per-hour services calculate total from hours × rate."
        />

        <div className="space-y-2 rounded-2xl border border-border/60 bg-background/40 p-4">
          <Label>Pricing Tier</Label>
          <div className="flex flex-wrap gap-2">
            {PRICING_TIERS.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setValue("servicePricingTier", tier.id, { shouldDirty: true })}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  servicePricingTier === tier.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/30",
                )}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {catalogServices.map((service) => {
            const checked = selectedServiceIds.includes(service.id);
            const rate = getServicePrice(service, servicePricingTier);
            const hours = serviceHours[service.id] ?? 0;
            const lineTotal =
              service.isStudioRent && checked ? Math.round(rate * hours * 100) / 100 : rate;

            return (
              <div
                key={service.id}
                className={cn(
                  "rounded-2xl border border-border/60 bg-background/50 p-4 backdrop-blur-md transition-all",
                  checked && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
                )}
              >
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-4",
                    service.mandatory && "cursor-default",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={service.mandatory}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                  <span className="flex flex-1 flex-wrap items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    {service.isStudioRent ? (
                      <Badge variant="secondary">Per Hour</Badge>
                    ) : null}
                    {service.mandatory ? <Badge variant="secondary">Mandatory</Badge> : null}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {service.isStudioRent
                      ? `${formatINR(rate)} / hr`
                      : formatINR(lineTotal)}
                  </span>
                </label>

                {service.isStudioRent && checked ? (
                  <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
                    <Label htmlFor={`service-hours-${service.id}`}>Hours</Label>
                    <Input
                      id={`service-hours-${service.id}`}
                      type="number"
                      min={0}
                      step={0.5}
                      value={hours > 0 ? hours : ""}
                      onChange={(event) => setServiceHours(service.id, event.target.value)}
                      placeholder="e.g. 1.5"
                    />
                    <p className="text-xs text-muted-foreground">
                      Total: {formatINR(lineTotal)} ({formatINR(rate)} × {hours || 0}h)
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
          <Label>Discount</Label>
          <div className="flex flex-wrap gap-2">
            {DISCOUNT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setValue("studioDiscountType", type.id, { shouldDirty: true })}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  studioDiscountType === type.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/30",
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
          {studioDiscountType === "percent" ? (
            <Input
              id="studio-discount-percent"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={studioDiscountPercent > 0 ? studioDiscountPercent : ""}
              onChange={(event) => {
                const parsed = Number.parseFloat(event.target.value);
                setValue("studioDiscountPercent", Number.isFinite(parsed) ? parsed : 0, {
                  shouldDirty: true,
                });
              }}
              placeholder="e.g. 10"
            />
          ) : (
            <Input
              id="studio-discount-amount"
              type="number"
              min={0}
              step={1}
              value={studioDiscountAmount > 0 ? studioDiscountAmount : ""}
              onChange={(event) => {
                const parsed = Number.parseFloat(event.target.value);
                setValue("studioDiscountAmount", Number.isFinite(parsed) ? parsed : 0, {
                  shouldDirty: true,
                });
              }}
              placeholder="e.g. 2000"
            />
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
          <Label>Custom Services</Label>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <Input
              placeholder="Service name"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
            />
            <Input
              type="number"
              min={0}
              placeholder="Price"
              value={customPrice}
              onChange={(event) => setCustomPrice(event.target.value)}
            />
            <Button type="button" variant="outline" onClick={addCustomService}>
              <PlusIcon className="size-4" />
              Add Custom Service
            </Button>
          </div>
          {customServices.length > 0 ? (
            <ul className="space-y-2">
              {customServices.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <span>
                    {service.name} — {formatINR(service.price)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomService(service.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <QuotationSummary
        quotation={quotation}
        discountType={studioDiscountType}
        discountPercent={studioDiscountPercent}
        discountAmountInput={studioDiscountAmount}
      />
    </div>
  );
}
