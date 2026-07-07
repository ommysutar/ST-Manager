"use client";

import { layout } from "@st-manager/theme";
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

export function Sidebar() {
  const pathname = usePathname();
  const { navHrefAllowed } = usePermissions();

  const visibleItems = navItems.filter((item) => navHrefAllowed(item.href));

  return (
    <aside
      className="flex shrink-0 flex-col border-r border-border bg-card print:hidden"
      style={{ width: layout.sidebarWidth }}
      data-print-hide
    >
      <nav className="flex flex-col gap-1 p-3">
        {visibleItems.map((item) => {
          const isActive = !item.disabled && isNavActive(pathname, item.href);

          if (item.disabled) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/60"
              >
                <item.icon className="size-4" />
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
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
