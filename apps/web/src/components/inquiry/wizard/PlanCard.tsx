"use client";

import { cn, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import { CheckIcon } from "lucide-react";

import { formatINR } from "@/lib/currency";
import type { ProjectPlan } from "@/lib/inquiry/types";

interface PlanCardProps {
  plan: ProjectPlan;
  selected: boolean;
  onSelect: () => void;
}

export function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full rounded-2xl text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "scale-[1.02]" : "hover:scale-[1.01]",
      )}
    >
      <Card
        className={cn(
          "h-full overflow-hidden border-border/60 bg-background/50 backdrop-blur-md transition-all duration-300 dark:bg-background/30",
          plan.highlighted && "border-primary/30 shadow-lg shadow-primary/10",
          selected && "border-primary ring-2 ring-primary/30",
        )}
      >
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>Premium studio package</CardDescription>
            </div>
            {selected ? (
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CheckIcon className="size-4" />
              </span>
            ) : null}
          </div>
          <p className="text-3xl font-bold tracking-tight">{formatINR(plan.price)}</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </button>
  );
}
