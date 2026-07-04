"use client";

import { Input, Label, Textarea } from "@st-manager/ui";
import { useFormContext } from "react-hook-form";

import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { PROJECT_CATEGORIES } from "@/lib/inquiry/constants";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";

export function ProjectDetailsStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<InquiryWizardSchema>();

  return (
    <div>
      <WizardStepHeader
        title="Project Details"
        description="Define the studio project scope, timeline, and priority."
      />
      <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="projectName">Project Name *</Label>
        <Input id="projectName" placeholder="Album / EP / Podcast name" {...register("projectName")} />
        {errors.projectName ? (
          <p className="text-sm text-destructive">{errors.projectName.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="projectCategory">Project Category *</Label>
        <select
          id="projectCategory"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          {...register("projectCategory")}
        >
          <option value="">Select category</option>
          {PROJECT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {errors.projectCategory ? (
          <p className="text-sm text-destructive">{errors.projectCategory.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <select
          id="priority"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          {...register("priority")}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventDate">Event Date</Label>
        <Input id="eventDate" type="date" {...register("eventDate")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="deliveryDate">Delivery Date</Label>
        <Input id="deliveryDate" type="date" {...register("deliveryDate")} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="projectDescription">Project Description</Label>
        <Textarea
          id="projectDescription"
          placeholder="Describe the project scope, goals, and deliverables"
          rows={4}
          {...register("projectDescription")}
        />
      </div>
    </div>
    </div>
  );
}
