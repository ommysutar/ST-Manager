"use client";

import { Button } from "@st-manager/ui";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

interface WizardNavigationProps {
  step: number;
  isSubmitting: boolean;
  showPaymentActions: boolean;
  showDecisionActions: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCreateProject: () => void;
}

export function WizardNavigation({
  step,
  isSubmitting,
  showPaymentActions,
  showDecisionActions,
  onPrevious,
  onNext,
  onCreateProject,
}: WizardNavigationProps) {
  if (showDecisionActions) {
    return (
      <div className="mt-8 flex justify-start border-t border-border/50 pt-6">
        <Button type="button" variant="outline" onClick={onPrevious} disabled={isSubmitting}>
          <ArrowLeftIcon className="size-4" />
          Previous
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-6">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={step === 1 || isSubmitting}
      >
        <ArrowLeftIcon className="size-4" />
        Previous
      </Button>

      {showPaymentActions ? (
        <Button type="button" size="lg" disabled={isSubmitting} onClick={onCreateProject}>
          Create Project
        </Button>
      ) : (
        <Button type="button" disabled={isSubmitting} onClick={onNext}>
          Next
          <ArrowRightIcon className="size-4" />
        </Button>
      )}
    </div>
  );
}
