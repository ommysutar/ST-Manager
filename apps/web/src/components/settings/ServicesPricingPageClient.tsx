"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@st-manager/ui";
import { PlusIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ServiceDeleteDialog } from "@/components/settings/ServiceDeleteDialog";
import { ServiceFormDialog } from "@/components/settings/ServiceFormDialog";
import { ServicesTable } from "@/components/settings/ServicesTable";
import { useAuth } from "@/hooks/useAuth";
import { useAllStudioServices } from "@/hooks/useInquiryStorage";
import { ENABLE_DEMO_DATA } from "@/lib/app-config";
import { layout } from "@st-manager/theme";
import type { ServiceFormValues } from "@/lib/inquiry/service.schema";
import {
  createStudioService,
  deleteStudioService,
  filterStudioServices,
  resetStudioServicesToDefaults,
  sortStudioServices,
  updateStudioService,
  type ServiceSortDirection,
  type ServiceSortField,
} from "@/lib/inquiry/services";
import type { StudioService } from "@/lib/inquiry/types";

export function ServicesPricingPageClient() {
  const { isAuthenticated } = useAuth();
  const allServices = useAllStudioServices();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<ServiceSortField>("name");
  const [sortDirection, setSortDirection] = useState<ServiceSortDirection>("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingService, setEditingService] = useState<StudioService | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<StudioService | null>(null);

  const visibleServices = useMemo(() => {
    const filtered = filterStudioServices(allServices, searchQuery);
    return sortStudioServices(filtered, sortField, sortDirection);
  }, [allServices, searchQuery, sortField, sortDirection]);

  function handleSortFieldChange(field: ServiceSortField) {
    if (field === sortField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "price" ? "desc" : "asc");
  }

  function openCreateDialog() {
    setFormMode("create");
    setEditingService(null);
    setFormOpen(true);
  }

  function openEditDialog(service: StudioService) {
    setFormMode("edit");
    setEditingService(service);
    setFormOpen(true);
  }

  function openDeleteDialog(service: StudioService) {
    setDeletingService(service);
    setDeleteOpen(true);
  }

  function servicePayloadFromForm(values: ServiceFormValues) {
    const prices = {
      basic: values.priceBasic,
      standard: values.priceStandard,
      premium: values.pricePremium,
    };

    return {
      name: values.name,
      price: prices.standard,
      prices,
      category: values.category ?? "",
      description: values.description ?? "",
      active: values.active,
      mandatory: values.isStudioRent ? false : values.mandatory,
      isStudioRent: values.isStudioRent,
    };
  }

  function handleFormSubmit(values: ServiceFormValues) {
    const payload = servicePayloadFromForm(values);

    if (formMode === "create") {
      createStudioService(payload);
      toast.success("Service added", {
        description: `${values.name} is now available in the inquiry wizard.`,
      });
      return;
    }

    if (!editingService) {
      return;
    }

    updateStudioService(editingService.id, payload);
    toast.success("Service updated", {
      description: "Changes are reflected immediately in the wizard.",
    });
  }

  function handleDeleteConfirm() {
    if (!deletingService) {
      return;
    }

    deleteStudioService(deletingService.id);
    toast.success("Service deleted", {
      description: `${deletingService.name} was removed from the wizard.`,
    });
    setDeletingService(null);
  }

  function handleToggleActive(service: StudioService, active: boolean) {
    updateStudioService(service.id, { active, mandatory: active ? service.mandatory : false });
    toast.success(active ? "Service activated" : "Service deactivated");
  }

  function handleToggleMandatory(service: StudioService, mandatory: boolean) {
    updateStudioService(service.id, { mandatory });
    toast.success(mandatory ? "Service marked mandatory" : "Service marked optional");
  }

  function handleResetDefaults() {
    resetStudioServicesToDefaults();
    toast.success("Default services restored");
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Sign in as Owner/Admin to manage studio services.
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
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Service Management</h1>
          <p className="text-sm text-muted-foreground">
            Owner Panel — create, edit, and price studio services used by the New Inquiry Wizard.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="lg" className="shadow-lg shadow-primary/10">
          <PlusIcon className="size-4" />
          Add New Service
        </Button>
      </div>

      <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
        <CardHeader className="gap-4 border-b border-border/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Studio Services</CardTitle>
            <CardDescription>
              {allServices.length} total · {allServices.filter((service) => service.active).length}{" "}
              active · prices shown in ₹
            </CardDescription>
          </div>
          <div className="flex w-full max-w-md items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search services..."
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={handleResetDefaults} disabled={!ENABLE_DEMO_DATA}>
              <RotateCcwIcon className="size-4" />
              <span className="sr-only">Reset demo defaults</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <ServicesTable
            services={visibleServices}
            sortField={sortField}
            sortDirection={sortDirection}
            emptyMessage={
              allServices.length === 0
                ? 'No services configured yet. Click "Add New Service" to create your first service.'
                : "No services match your search."
            }
            onSortFieldChange={handleSortFieldChange}
            onToggleActive={handleToggleActive}
            onToggleMandatory={handleToggleMandatory}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </CardContent>
      </Card>

      <ServiceFormDialog
        open={formOpen}
        mode={formMode}
        service={editingService}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
      />

      <ServiceDeleteDialog
        open={deleteOpen}
        service={deletingService}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
