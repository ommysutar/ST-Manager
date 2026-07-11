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
import type { TeamMemberResponseDto } from "@st-manager/contracts";
import { updateTeamMemberSchema, type UpdateTeamMemberInput } from "@st-manager/validation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import type { PermissionResponseDto } from "@st-manager/contracts";

import { ALL_TEAM_ROLES } from "@/lib/team/constants";

interface EditMemberDialogProps {
  open: boolean;
  member: TeamMemberResponseDto | null;
  permissions: PermissionResponseDto[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UpdateTeamMemberInput) => Promise<void>;
}

export function EditMemberDialog({
  open,
  member,
  permissions,
  onOpenChange,
  onSubmit,
}: EditMemberDialogProps) {
  const [showCustomPermissions, setShowCustomPermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const form = useForm<UpdateTeamMemberInput>({
    resolver: zodResolver(updateTeamMemberSchema),
    defaultValues: {},
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (!open || !member) {
      return;
    }

    const custom = member.customPermissions ?? [];
    void Promise.resolve().then(() => {
      reset({
        fullName: member.fullName ?? "",
        phone: member.phone ?? "",
        role: member.role as UpdateTeamMemberInput["role"],
      });
      setShowCustomPermissions(custom.length > 0);
      setSelectedPermissions(custom);
    });
  }, [open, member, reset]);

  async function handleFormSubmit(values: UpdateTeamMemberInput) {
    await onSubmit({
      ...values,
      phone: values.phone?.trim() || null,
      customPermissions: showCustomPermissions ? selectedPermissions : null,
    });
    onOpenChange(false);
  }

  function togglePermission(key: string) {
    setSelectedPermissions((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  if (!member) {
    return null;
  }

  const isOwner = member.role === "owner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>{member.email}</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="edit-full-name">Full Name</Label>
            <Input id="edit-full-name" {...register("fullName")} />
            {errors.fullName ? (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" {...register("phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <select
              id="edit-role"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs disabled:opacity-50"
              disabled={isOwner}
              {...register("role")}
            >
              {ALL_TEAM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {TEAM_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            {isOwner ? (
              <p className="text-xs text-muted-foreground">
                Transfer ownership to change the owner role.
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={showCustomPermissions}
                onCheckedChange={(checked) => setShowCustomPermissions(checked === true)}
              />
              Custom Permissions
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
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
