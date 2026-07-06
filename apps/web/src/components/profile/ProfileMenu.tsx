"use client";

import { Button } from "@st-manager/ui";
import { UserCircleIcon } from "lucide-react";
import { useState } from "react";

import { ProfileSettingsDialog } from "@/components/profile/ProfileSettingsDialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { normalizeRole } from "@/lib/profile/storage";

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const profile = useProfile(user);
  const [open, setOpen] = useState(false);

  if (!user) {
    return null;
  }

  const role = normalizeRole(user.role);
  const displayName = profile?.fullName || user.email;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          {profile?.profilePhotoDataUrl ? (
            <img
              src={profile.profilePhotoDataUrl}
              alt=""
              className="size-7 rounded-full object-cover"
            />
          ) : (
            <UserCircleIcon className="size-7 text-muted-foreground" />
          )}
          <span className="hidden max-w-[140px] truncate lg:inline">{displayName}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
            {role}
          </span>
        </button>
        <Button type="button" variant="outline" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>

      <ProfileSettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
