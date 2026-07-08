"use client";

import { cn } from "@st-manager/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { usePermissions } from "@/hooks/usePermissions";

import { navItems } from "./nav-items";

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarNavProps {
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({ onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();
  const { navHrefAllowed } = usePermissions();

  const visibleItems = navItems.filter((item) => navHrefAllowed(item.href));

  return (
    <nav className={cn("flex flex-col gap-1 p-3", className)}>
      {visibleItems.map((item) => {
        const isActive = !item.disabled && isNavActive(pathname, item.href);

        if (item.disabled) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground/60"
            >
              <item.icon className="size-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.comingSoon ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  Soon
                </span>
              ) : null}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <item.icon className="size-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
