"use client";

import { layout } from "@st-manager/theme";

import { SidebarNav } from "./SidebarNav";

export function Sidebar() {
  return (
    <aside
      className="hidden shrink-0 flex-col border-r border-border bg-card lg:flex print:hidden"
      style={{ width: layout.sidebarWidth }}
      data-print-hide
      aria-label="Main navigation"
    >
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <span className="text-sm font-semibold tracking-tight">ST Manager</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  );
}
