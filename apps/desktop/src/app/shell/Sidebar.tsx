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
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
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
        ))}
      </nav>
    </aside>
  );
}
