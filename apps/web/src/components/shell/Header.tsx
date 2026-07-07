"use client";

import { layout } from "@st-manager/theme";

import { GlobalSearch } from "@/components/search/GlobalSearch";
import { ProfileMenu } from "@/components/profile/ProfileMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const STUDIO_NAME_PLACEHOLDER = "YOUR STUDIO NAME";

export function Header() {
  const { user } = useAuth();
  const profile = useProfile(user);

  const studioDisplayName = profile?.studioName?.trim()
    ? profile.studioName.trim().toUpperCase()
    : STUDIO_NAME_PLACEHOLDER;

  return (
    <header
      className="flex items-center border-b border-border bg-background/80 px-6 backdrop-blur-md print:hidden"
      style={{ height: layout.headerHeight }}
      data-print-hide
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 text-sm font-semibold">ST Manager v1.0</span>
        <span aria-hidden className="shrink-0 text-muted-foreground/50">
          |
        </span>
        <span className="max-w-[12rem] shrink-0 truncate text-base font-bold uppercase tracking-wide sm:max-w-xs lg:max-w-md">
          {studioDisplayName}
        </span>
        <span aria-hidden className="shrink-0 text-muted-foreground/50">
          |
        </span>
        <GlobalSearch />
      </div>
      <div data-slot="header-actions" className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  );
}
