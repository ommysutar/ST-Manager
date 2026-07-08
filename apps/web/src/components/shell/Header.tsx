"use client";

import { layout } from "@st-manager/theme";
import { Button } from "@st-manager/ui";
import { MenuIcon } from "lucide-react";

import { GlobalSearch } from "@/components/search/GlobalSearch";
import { ProfileMenu } from "@/components/profile/ProfileMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const STUDIO_NAME_PLACEHOLDER = "YOUR STUDIO NAME";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const profile = useProfile(user);

  const studioDisplayName = profile?.studioName?.trim()
    ? profile.studioName.trim().toUpperCase()
    : STUDIO_NAME_PLACEHOLDER;

  return (
    <header
      className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md sm:gap-3 sm:px-4 lg:px-6 print:hidden"
      style={{
        minHeight: layout.headerHeight,
        paddingTop: "max(0px, env(safe-area-inset-top))",
      }}
      data-print-hide
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        aria-label="Open navigation menu"
        aria-controls="mobile-nav-drawer"
        onClick={onMenuClick}
      >
        <MenuIcon className="size-5" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <span className="truncate text-sm font-semibold sm:text-base">ST Manager</span>
          <span aria-hidden className="hidden text-muted-foreground/50 sm:inline">
            |
          </span>
          <span className="hidden max-w-[8rem] truncate text-xs font-bold uppercase tracking-wide sm:inline sm:max-w-[10rem] sm:text-sm md:max-w-xs lg:max-w-md">
            {studioDisplayName}
          </span>
        </div>

        <span aria-hidden className="hidden shrink-0 text-muted-foreground/50 md:inline">
          |
        </span>

        <GlobalSearch />
      </div>

      <div
        data-slot="header-actions"
        className="flex shrink-0 items-center gap-1.5 sm:gap-2"
      >
        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  );
}
