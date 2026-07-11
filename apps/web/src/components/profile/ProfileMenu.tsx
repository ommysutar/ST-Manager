"use client";

import { cn } from "@st-manager/ui";
import { LogOutIcon, SettingsIcon, UserCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ProfileSettingsDialog } from "@/components/profile/ProfileSettingsDialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { normalizeRole } from "@/lib/profile/storage";

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const profile = useProfile(user);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (!user) {
    return null;
  }

  const role = normalizeRole(user.role);
  const displayName = profile?.fullName || user.fullName || user.email;

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-sm transition-colors hover:bg-accent sm:px-2.5"
        >
          {profile?.profilePhotoDataUrl ? (
            <img
              src={profile.profilePhotoDataUrl}
              alt=""
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <UserCircleIcon className="size-8 text-muted-foreground" />
          )}
          <span className="hidden max-w-[120px] truncate xl:inline">{displayName}</span>
          <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary sm:inline">
            {role}
          </span>
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border/60 bg-background shadow-xl"
          >
            <div className="border-b border-border/60 px-4 py-3 sm:hidden">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="text-xs uppercase text-muted-foreground">{role}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
            >
              <SettingsIcon className="size-4 shrink-0" />
              Profile settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10",
              )}
            >
              <LogOutIcon className="size-4 shrink-0" />
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      <ProfileSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
