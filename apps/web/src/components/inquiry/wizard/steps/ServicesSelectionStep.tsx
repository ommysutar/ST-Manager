"use client";

import { Badge, Button, cn, Checkbox, Input, Label } from "@st-manager/ui";
import { PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

import { QuotationSummary } from "@/components/inquiry/wizard/QuotationSummary";
import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { useStudioServices } from "@/hooks/useInquiryStorage";
import { formatINR } from "@/lib/currency";
import { STUDIO_RENT_SERVICE_ID } from "@/lib/inquiry/constants";
import { calculateQuotation } from "@/lib/inquiry/quotation";
import { generateId, getServicePrice } from "@/lib/inquiry/services";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";
import type { ServicePricingTier } from "@/lib/inquiry/types";

const PRICING_TIERS: { id: ServicePricingTier; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "standard", label: "Standard" },
  { id: "premium", label: "Premium" },
];

export function ServicesSelectionStep() {
  const { watch, setValue } = useFormContext<InquiryWizardSchema>();
  const services = useStudioServices();
  const selectedServiceIds = watch("selectedServiceIds");
  const servicePricingTier = watch("servicePricingTier");
  const studioDiscountPercent = watch("studioDiscountPercent");
  const customServices = watch("customServices");
  const studioRentHours = watch("studioRentHours");

  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const catalogServices = useMemo(
    () => services.filter((service) => !service.isStudioRent),
    [services],
  );
  const rentService = useMemo(
    () => services.find((service) => service.id === STUDIO_RENT_SERVICE_ID),
    [services],
  );

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
          studioRentHours,
          studioDiscountPercent,
        },
        services,
      ),
    [
      selectedServiceIds,
      servicePricingTier,
      customServices,
      studioRentHours,
      studioDiscountPercent,
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <WizardStepHeader
          title="Choose Services"
          description="Select services using Basic, Standard, or Premium pricing. Add custom services or studio rent as needed."
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

        {catalogServices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            No active services available.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {catalogServices.map((service) => {
              const checked = selectedServiceIds.includes(service.id);
              const price = getServicePrice(service, servicePricingTier);

              return (
                <label
                  key={service.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-4 rounded-2xl border border-border/60 bg-background/50 p-4 backdrop-blur-md transition-all hover:border-primary/30",
                    checked && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
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
                    {service.mandatory ? <Badge variant="secondary">Mandatory</Badge> : null}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">{formatINR(price)}</span>
                </label>
              );
            })}
          </div>
        )}

        {rentService ? (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
            <Label htmlFor="studio-rent-hours">Studio Rent — Hours</Label>
            <p className="text-xs text-muted-foreground">
              Rate: {formatINR(getServicePrice(rentService, servicePricingTier))} / hour (
              {servicePricingTier})
            </p>
            <Input
              id="studio-rent-hours"
              type="number"
              min={0}
              step={1}
              value={studioRentHours || ""}
              onChange={(event) =>
                setValue("studioRentHours", Number(event.target.value) || 0, { shouldDirty: true })
              }
              placeholder="Enter hours"
            />
          </div>
        ) : null}

        <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
          <Label htmlFor="studio-discount">Discount (%)</Label>
          <Input
            id="studio-discount"
            type="number"
            min={0}
            max={100}
            step={1}
            value={studioDiscountPercent}
            onChange={(event) =>
              setValue("studioDiscountPercent", Number(event.target.value) || 0, {
                shouldDirty: true,
              })
            }
            placeholder="e.g. 15"
          />
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

      <QuotationSummary quotation={quotation} discountPercent={studioDiscountPercent} />
    </div>
  );
}
