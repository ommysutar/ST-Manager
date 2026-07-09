"use client";

import { cn } from "@st-manager/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { usePermissions } from "@/hooks/usePermissions";

const teamNavItems = [
  {
    href: "/settings/team-members",
    label: "Team Members",
  },
] as const;

export function SettingsTeamNav() {
  const pathname = usePathname();
  const { canAccessTeamManagement } = usePermissions();

  if (!canAccessTeamManagement()) {
    return null;
  }

  return (
    <nav aria-label="Team management" className="flex flex-wrap gap-2">
      {teamNavItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
