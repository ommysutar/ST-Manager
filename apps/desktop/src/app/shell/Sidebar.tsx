import { layout } from "@st-manager/theme";
import { cn } from "@st-manager/ui";
import { NavLink } from "react-router";

import { navItems } from "./nav-items";

export function Sidebar() {
  return (
    <aside
      className="flex shrink-0 flex-col border-r border-border bg-card"
      style={{ width: layout.sidebarWidth }}
    >
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
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
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
