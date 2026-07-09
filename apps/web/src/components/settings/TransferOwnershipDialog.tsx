"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
} from "@st-manager/ui";
import type { TeamMemberResponseDto } from "@st-manager/contracts";
import { useState } from "react";

interface TransferOwnershipDialogProps {
  open: boolean;
  members: TeamMemberResponseDto[];
  currentUserId?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newOwnerUserId: string) => Promise<void>;
}

export function TransferOwnershipDialog({
  open,
  members,
  currentUserId,
  onOpenChange,
  onConfirm,
}: TransferOwnershipDialogProps) {
  const [selectedId, setSelectedId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const candidates = members.filter(
    (member) =>
      member.status === "active" &&
      member.role !== "owner" &&
      member.id !== currentUserId,
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSelectedId(candidates[0]?.id ?? "");
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    if (!selectedId) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(selectedId);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Ownership</DialogTitle>
          <DialogDescription>
            Select an active team member to become the new studio owner. You will become a manager.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="new-owner">New Owner</Label>
            <select
              id="new-owner"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={candidates.length === 0}
            >
              {candidates.length === 0 ? (
                <option value="">No eligible members</option>
              ) : (
                candidates.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName ?? member.email} ({member.email})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedId || isSubmitting}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? "Transferring…" : "Transfer Ownership"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
