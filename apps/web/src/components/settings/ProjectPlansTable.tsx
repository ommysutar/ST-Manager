"use client";

import {
  Badge,
  Button,
  cn,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@st-manager/ui";
import { ArrowDownUpIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { formatINR } from "@/lib/currency";
import type { PlanSortDirection, PlanSortField } from "@/lib/inquiry/plans";
import type { ProjectPlan } from "@/lib/inquiry/types";

interface ProjectPlansTableProps {
  plans: ProjectPlan[];
  sortField: PlanSortField;
  sortDirection: PlanSortDirection;
  onSortFieldChange: (field: PlanSortField) => void;
  onToggleActive: (plan: ProjectPlan, active: boolean) => void;
  onEdit: (plan: ProjectPlan) => void;
  onDelete: (plan: ProjectPlan) => void;
}

function SortButton({
  label,
  field,
  activeField,
  onClick,
}: {
  label: string;
  field: PlanSortField;
  activeField: PlanSortField;
  direction: PlanSortDirection;
  onClick: () => void;
}) {
  const isActive = activeField === field;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-left font-medium transition-colors hover:text-primary",
        isActive && "text-primary",
      )}
    >
      {label}
      <ArrowDownUpIcon className="size-3.5 opacity-70" />
    </button>
  );
}

export function ProjectPlansTable({
  plans,
  sortField,
  sortDirection,
  onSortFieldChange,
  onToggleActive,
  onEdit,
  onDelete,
}: ProjectPlansTableProps) {
  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center text-sm text-muted-foreground">
        No project plans match your search.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background/40 backdrop-blur-md">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <SortButton
                  label="Plan Name"
                  field="name"
                  activeField={sortField}
                  direction={sortDirection}
                  onClick={() => onSortFieldChange("name")}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label="Price (₹)"
                  field="price"
                  activeField={sortField}
                  direction={sortDirection}
                  onClick={() => onSortFieldChange("price")}
                />
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.features.length} feature{plan.features.length === 1 ? "" : "s"}
                      {plan.highlighted ? " · Highlighted" : ""}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{formatINR(plan.price)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={plan.active}
                      onCheckedChange={(checked) => onToggleActive(plan, checked)}
                      aria-label={`Toggle ${plan.name} active status`}
                    />
                    <Badge variant={plan.active ? "success" : "secondary"}>
                      {plan.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(plan)}>
                      <PencilIcon className="size-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(plan)}
                    >
                      <Trash2Icon className="size-4" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
