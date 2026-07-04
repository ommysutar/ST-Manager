import { layout } from "@st-manager/theme";

import { LoginActions } from "@/components/auth/LoginActions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header() {
  return (
    <header
      className="flex items-center border-b border-border bg-background/80 px-6 backdrop-blur-md"
      style={{ height: layout.headerHeight }}
    >
      <span className="text-sm font-semibold">ST Manager</span>
      <div className="flex-1" />
      <div data-slot="header-actions" className="flex items-center gap-2">
        <ThemeToggle />
        <LoginActions />
      </div>
    </header>
  );
}
