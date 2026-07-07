"use client";

import { cn, Progress } from "@st-manager/ui";
import { CheckIcon } from "lucide-react";

import { WIZARD_STEPS } from "@/lib/inquiry/constants";

interface WizardProgressProps {
  currentStep: number;
  maxStep?: number;
}

export function WizardProgress({ currentStep, maxStep = 5 }: WizardProgressProps) {
  const visibleSteps = WIZARD_STEPS.filter((step) => step.id <= maxStep);
  const progressValue = ((currentStep - 1) / (visibleSteps.length - 1)) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          Step {currentStep} of {maxStep}
        </p>
        <p className="text-sm font-medium">{visibleSteps[currentStep - 1]?.label}</p>
      </div>

      <Progress value={Number.isFinite(progressValue) ? progressValue : 0} className="h-1.5" />

      <ol className="hidden gap-2 sm:grid sm:grid-cols-5">
        {visibleSteps.map((step) => {
          const isComplete = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <li
              key={step.id}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-all duration-300",
                isCurrent &&
                  "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20 backdrop-blur-sm",
                isComplete && "border-emerald-500/30 bg-emerald-500/5",
                !isCurrent && !isComplete && "border-border/60 bg-background/40",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isCurrent && "bg-primary text-primary-foreground",
                  isComplete && "bg-emerald-500 text-white",
                  !isCurrent && !isComplete && "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? <CheckIcon className="size-3.5" /> : step.id}
              </span>
              <span className="text-[11px] leading-tight font-medium">{step.shortLabel}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
