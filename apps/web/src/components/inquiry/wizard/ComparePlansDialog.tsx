"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@st-manager/ui";

import { formatINR } from "@/lib/currency";
import type { ProjectPlan } from "@/lib/inquiry/types";

interface ComparePlansDialogProps {
  plans: ProjectPlan[];
}

export function ComparePlansDialog({ plans }: ComparePlansDialogProps) {
  const allFeatures = Array.from(new Set(plans.flatMap((plan) => plan.features)));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={plans.length === 0}>
          Compare Plans
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Compare Project Plans</DialogTitle>
          <DialogDescription>
            All prices are in Indian Rupees (₹). Choose the plan that fits your project scope.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-3 text-left font-medium">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.id} className="px-3 py-3 text-left font-medium">
                    <div>{plan.name}</div>
                    <div className="text-primary">{formatINR(plan.price)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((feature) => (
                <tr key={feature} className="border-b border-border/50">
                  <td className="px-3 py-2 text-muted-foreground">{feature}</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-3 py-2">
                      {plan.features.includes(feature) ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
