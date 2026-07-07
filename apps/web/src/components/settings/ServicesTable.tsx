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
import type { ServiceSortDirection, ServiceSortField } from "@/lib/inquiry/services";
import type { StudioService } from "@/lib/inquiry/types";

interface ServicesTableProps {
  services: StudioService[];
  sortField: ServiceSortField;
  sortDirection: ServiceSortDirection;
  emptyMessage?: string;
  onSortFieldChange: (field: ServiceSortField) => void;
  onToggleActive: (service: StudioService, active: boolean) => void;
  onToggleMandatory: (service: StudioService, mandatory: boolean) => void;
  onEdit: (service: StudioService) => void;
  onDelete: (service: StudioService) => void;
}

function SortButton({
  label,
  field,
  activeField,
  direction,
  onClick,
}: {
  label: string;
  field: ServiceSortField;
  activeField: ServiceSortField;
  direction: ServiceSortDirection;
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
      {isActive ? (
        <span className="sr-only">Sorted {direction === "asc" ? "ascending" : "descending"}</span>
      ) : null}
    </button>
  );
}

export function ServicesTable({
  services,
  sortField,
  sortDirection,
  emptyMessage = "No services configured yet. Click \"Add New Service\" to create your first service.",
  onSortFieldChange,
  onToggleActive,
  onToggleMandatory,
  onEdit,
  onDelete,
}: ServicesTableProps) {
  function toggleSort(field: ServiceSortField) {
    onSortFieldChange(field);
  }

  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
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
                  label="Service Name"
                  field="name"
                  activeField={sortField}
                  direction={sortDirection}
                  onClick={() => toggleSort("name")}
                />
              </TableHead>
              <TableHead>Basic (₹)</TableHead>
              <TableHead>Standard (₹)</TableHead>
              <TableHead>Premium (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mandatory</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {service.category ? (
                        <span className="text-xs text-muted-foreground">{service.category}</span>
                      ) : null}
                      {service.isStudioRent ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Hourly rent
                        </Badge>
                      ) : null}
                    </div>
                    {service.description ? (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {service.description}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{formatINR(service.prices.basic)}</TableCell>
                <TableCell className="font-medium">{formatINR(service.prices.standard)}</TableCell>
                <TableCell className="font-medium">{formatINR(service.prices.premium)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={service.active}
                      onCheckedChange={(checked) => onToggleActive(service, checked)}
                      aria-label={`Toggle ${service.name} active status`}
                    />
                    <Badge variant={service.active ? "success" : "secondary"}>
                      {service.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={service.mandatory}
                      disabled={!service.active || service.isStudioRent}
                      onCheckedChange={(checked) => onToggleMandatory(service, checked)}
                      aria-label={`Toggle ${service.name} mandatory status`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {service.mandatory ? "Required" : "Optional"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(service)}>
                      <PencilIcon className="size-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(service)}
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
