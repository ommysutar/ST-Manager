"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@st-manager/ui";

import { formatINR } from "@/lib/currency";
import type { StudioService } from "@/lib/inquiry/types";

interface ServiceDeleteDialogProps {
  open: boolean;
  service: StudioService | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ServiceDeleteDialog({
  open,
  service,
  onOpenChange,
  onConfirm,
}: ServiceDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete service?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The service will be removed from Service Management and
            will no longer appear in the New Inquiry Wizard.
          </DialogDescription>
        </DialogHeader>

        {service ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <p className="font-medium">{service.name}</p>
            <p className="text-muted-foreground">{formatINR(service.price)}</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Delete Service
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
