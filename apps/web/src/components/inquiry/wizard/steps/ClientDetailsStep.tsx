"use client";

import { Input, Label, Textarea } from "@st-manager/ui";
import { useFormContext } from "react-hook-form";

import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";

export function ClientDetailsStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<InquiryWizardSchema>();

  return (
    <div>
      <WizardStepHeader
        title="Client Details"
        description="Capture client contact information. Fields marked with * are required."
      />
      <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="clientName">Client Name *</Label>
        <Input id="clientName" placeholder="Enter client name" {...register("clientName")} />
        {errors.clientName ? (
          <p className="text-sm text-destructive">{errors.clientName.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobileNumber">Mobile Number *</Label>
        <Input id="mobileNumber" placeholder="+91 98765 43210" {...register("mobileNumber")} />
        {errors.mobileNumber ? (
          <p className="text-sm text-destructive">{errors.mobileNumber.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
        <Input id="whatsappNumber" placeholder="+91 98765 43210" {...register("whatsappNumber")} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="client@example.com" {...register("email")} />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" placeholder="Street, city, state" rows={3} {...register("address")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Reference</Label>
        <Input id="reference" placeholder="Referral source" {...register("reference")} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Additional client notes" rows={3} {...register("notes")} />
      </div>
    </div>
    </div>
  );
}
