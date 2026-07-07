"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@st-manager/ui";

import type { ClientResponseDto } from "@st-manager/contracts";

interface ClientDeleteDialogProps {
  open: boolean;
  client: ClientResponseDto | null;
  hasLinkedRecords: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ClientDeleteDialog({
  open,
  client,
  hasLinkedRecords,
  isDeleting,
  onOpenChange,
  onConfirm,
}: ClientDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Client?</DialogTitle>
          <DialogDescription>
            {hasLinkedRecords
              ? "This client has linked records. Deleting this client will also remove all related data. Do you want to continue?"
              : "Are you sure you want to permanently delete this client?"}
          </DialogDescription>
        </DialogHeader>

        {client ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <p className="font-medium">{client.name}</p>
            {client.company ? (
              <p className="text-muted-foreground">{client.company}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isDeleting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={() => void onConfirm()}>
            {isDeleting ? "Deleting..." : hasLinkedRecords ? "Delete Everything" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
