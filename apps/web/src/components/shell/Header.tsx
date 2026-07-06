"use client";

import { layout } from "@st-manager/theme";

import { GlobalSearch } from "@/components/search/GlobalSearch";
import { LoginActions } from "@/components/auth/LoginActions";
import { ProfileMenu } from "@/components/profile/ProfileMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header
      className="flex items-center border-b border-border bg-background/80 px-6 backdrop-blur-md"
      style={{ height: layout.headerHeight }}
    >
      <span className="shrink-0 text-sm font-semibold">ST Manager</span>
      <GlobalSearch />
      <div className="flex-1" />
      <div data-slot="header-actions" className="flex items-center gap-2">
        <ThemeToggle />
        {isAuthenticated ? <ProfileMenu /> : <LoginActions />}
      </div>
    </header>
  );
}
