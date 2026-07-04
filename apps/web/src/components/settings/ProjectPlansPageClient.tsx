"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@st-manager/ui";
import { PlusIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ProjectPlanDeleteDialog,
} from "@/components/settings/ProjectPlanDeleteDialog";
import {
  ProjectPlanFormDialog,
} from "@/components/settings/ProjectPlanFormDialog";
import { ProjectPlansTable } from "@/components/settings/ProjectPlansTable";
import { useAuth } from "@/hooks/useAuth";
import { useAllProjectPlans } from "@/hooks/useInquiryStorage";
import { layout } from "@st-manager/theme";
import { textToFeatures, type ProjectPlanFormValues } from "@/lib/inquiry/plan.schema";
import {
  createProjectPlan,
  deleteProjectPlan,
  filterProjectPlans,
  resetProjectPlansToDefaults,
  sortProjectPlans,
  updateProjectPlan,
  type PlanSortDirection,
  type PlanSortField,
} from "@/lib/inquiry/plans";
import type { ProjectPlan } from "@/lib/inquiry/types";

export function ProjectPlansPageClient() {
  const { isAuthenticated } = useAuth();
  const allPlans = useAllProjectPlans();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<PlanSortField>("name");
  const [sortDirection, setSortDirection] = useState<PlanSortDirection>("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingPlan, setEditingPlan] = useState<ProjectPlan | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<ProjectPlan | null>(null);

  const visiblePlans = useMemo(() => {
    const filtered = filterProjectPlans(allPlans, searchQuery);
    return sortProjectPlans(filtered, sortField, sortDirection);
  }, [allPlans, searchQuery, sortField, sortDirection]);

  function handleSortFieldChange(field: PlanSortField) {
    if (field === sortField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "price" ? "desc" : "asc");
  }

  function openCreateDialog() {
    setFormMode("create");
    setEditingPlan(null);
    setFormOpen(true);
  }

  function openEditDialog(plan: ProjectPlan) {
    setFormMode("edit");
    setEditingPlan(plan);
    setFormOpen(true);
  }

  function openDeleteDialog(plan: ProjectPlan) {
    setDeletingPlan(plan);
    setDeleteOpen(true);
  }

  function handleFormSubmit(values: ProjectPlanFormValues) {
    const payload = {
      name: values.name,
      price: values.price,
      features: textToFeatures(values.featuresText),
      highlighted: values.highlighted,
      active: values.active,
    };

    if (formMode === "create") {
      createProjectPlan(payload);
      toast.success("Project plan added", {
        description: `${values.name} is now available in the inquiry wizard.`,
      });
      return;
    }

    if (!editingPlan) {
      return;
    }

    updateProjectPlan(editingPlan.id, payload);
    toast.success("Project plan updated", {
      description: "Changes are reflected immediately in the wizard.",
    });
  }

  function handleDeleteConfirm() {
    if (!deletingPlan) {
      return;
    }

    deleteProjectPlan(deletingPlan.id);
    toast.success("Project plan deleted", {
      description: `${deletingPlan.name} was removed from the wizard.`,
    });
    setDeletingPlan(null);
  }

  function handleToggleActive(plan: ProjectPlan, active: boolean) {
    updateProjectPlan(plan.id, { active });
    toast.success(active ? "Plan activated" : "Plan deactivated");
  }

  function handleResetDefaults() {
    resetProjectPlansToDefaults();
    toast.success("Default project plans restored");
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Sign in as Owner/Admin to manage project plans.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
            Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Project Plans</h1>
          <p className="text-sm text-muted-foreground">
            Owner Panel — create, edit, and price project plans used by the New Inquiry Wizard.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="lg" className="shadow-lg shadow-primary/10">
          <PlusIcon className="size-4" />
          Add Project Plan
        </Button>
      </div>

      <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
        <CardHeader className="gap-4 border-b border-border/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Studio Project Plans</CardTitle>
            <CardDescription>
              {allPlans.length} total · {allPlans.filter((plan) => plan.active).length} active ·
              prices shown in ₹
            </CardDescription>
          </div>
          <div className="flex w-full max-w-md items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search plans..."
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={handleResetDefaults}>
              <RotateCcwIcon className="size-4" />
              <span className="sr-only">Reset defaults</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <ProjectPlansTable
            plans={visiblePlans}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortFieldChange={handleSortFieldChange}
            onToggleActive={handleToggleActive}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </CardContent>
      </Card>

      <ProjectPlanFormDialog
        open={formOpen}
        mode={formMode}
        plan={editingPlan}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
      />

      <ProjectPlanDeleteDialog
        open={deleteOpen}
        plan={deletingPlan}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
