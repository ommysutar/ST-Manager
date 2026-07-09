"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@st-manager/ui";
import { TEAM_ROLE_LABELS } from "@st-manager/constants";
import { inviteTeamMemberSchema, type InviteTeamMemberInput } from "@st-manager/validation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import type { PermissionResponseDto } from "@st-manager/contracts";

import { INVITABLE_ROLES } from "@/lib/team/constants";

interface InviteMemberDialogProps {
  open: boolean;
  permissions: PermissionResponseDto[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InviteTeamMemberInput) => Promise<void>;
}

const defaultValues: InviteTeamMemberInput = {
  fullName: "",
  email: "",
  phone: "",
  role: "assistant",
};

export function InviteMemberDialog({
  open,
  permissions,
  onOpenChange,
  onSubmit,
}: InviteMemberDialogProps) {
  const [showCustomPermissions, setShowCustomPermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const form = useForm<InviteTeamMemberInput>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (!open) {
      return;
    }
    reset(defaultValues);
    setShowCustomPermissions(false);
    setSelectedPermissions([]);
  }, [open, reset]);

  async function handleFormSubmit(values: InviteTeamMemberInput) {
    await onSubmit({
      ...values,
      phone: values.phone?.trim() || undefined,
      customPermissions: showCustomPermissions && selectedPermissions.length > 0
        ? selectedPermissions
        : undefined,
    });
    onOpenChange(false);
  }

  function togglePermission(key: string) {
    setSelectedPermissions((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation email. The link expires in 7 days.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="invite-full-name">Full Name</Label>
            <Input id="invite-full-name" {...register("fullName")} />
            {errors.fullName ? (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input id="invite-email" type="email" {...register("email")} />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-phone">Phone (optional)</Label>
            <Input id="invite-phone" {...register("phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              {...register("role")}
            >
              {INVITABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {TEAM_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            {errors.role ? (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={showCustomPermissions}
                onCheckedChange={(checked) => setShowCustomPermissions(checked === true)}
              />
              Custom Permissions (optional)
            </label>

            {showCustomPermissions ? (
              <div className="grid max-h-48 gap-2 overflow-y-auto">
                {permissions.map((permission) => (
                  <label key={permission.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedPermissions.includes(permission.key)}
                      onCheckedChange={() => togglePermission(permission.key)}
                    />
                    {permission.label}
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send Invitation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
