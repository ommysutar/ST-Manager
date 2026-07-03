import { layout } from "@st-manager/theme";

import { LoginActions } from "../../components/auth/LoginActions";

export function Header() {
  return (
    <header
      className="flex items-center border-b border-border bg-background px-6"
      style={{ height: layout.headerHeight }}
    >
      <span className="text-sm font-semibold">ST Manager</span>
      <div className="flex-1" />
      <div data-slot="header-actions" className="flex items-center gap-2">
        <LoginActions />
      </div>
    </header>
  );
}
