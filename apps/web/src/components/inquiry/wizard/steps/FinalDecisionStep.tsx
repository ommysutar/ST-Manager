"use client";

import { Button } from "@st-manager/ui";
import { FileTextIcon, FolderPlusIcon } from "lucide-react";

import { QuotationSummary } from "@/components/inquiry/wizard/QuotationSummary";
import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { calculateQuotation } from "@/lib/inquiry/quotation";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";
import { useFormContext } from "react-hook-form";

interface FinalDecisionStepProps {
  onSaveInquiry: () => void;
  onAddToProject: () => void;
  isSubmitting: boolean;
}

export function FinalDecisionStep({
  onSaveInquiry,
  onAddToProject,
  isSubmitting,
}: FinalDecisionStepProps) {
  const { watch } = useFormContext<InquiryWizardSchema>();
  const values = watch();
  const quotation = calculateQuotation(values);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <QuotationSummary
        quotation={quotation}
        discountPercent={values.studioDiscountPercent}
        compact
      />

      <div className="flex flex-col gap-4">
        <WizardStepHeader
          title="Final Decision"
          description="Save as inquiry if the client has not confirmed yet, or continue to create a project immediately."
        />

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-auto min-h-24 flex-col gap-2 rounded-2xl border-border/70 bg-background/50 py-6 backdrop-blur-md"
          disabled={isSubmitting}
          onClick={onSaveInquiry}
        >
          <FileTextIcon className="size-6" />
          <span className="text-base font-semibold">Save Only Inquiry</span>
          <span className="text-xs font-normal text-muted-foreground">
            Status: Inquiry — appears in Inquiry menu
          </span>
        </Button>

        <Button
          type="button"
          size="lg"
          className="h-auto min-h-24 flex-col gap-2 rounded-2xl py-6 shadow-lg shadow-primary/10"
          disabled={isSubmitting}
          onClick={onAddToProject}
        >
          <FolderPlusIcon className="size-6" />
          <span className="text-base font-semibold">Add To Project</span>
          <span className="text-xs font-normal text-primary-foreground/80">
            Continue to advance payment and create project
          </span>
        </Button>
      </div>
    </div>
  );
}
