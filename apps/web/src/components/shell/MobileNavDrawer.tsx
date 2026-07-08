"use client";

import { layout } from "@st-manager/theme";
import { cn } from "@st-manager/ui";
import { XIcon } from "lucide-react";
import { useEffect } from "react";

import { SidebarNav } from "./SidebarNav";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation menu"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="mobile-nav-drawer"
        aria-hidden={!open}
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card shadow-xl transition-transform duration-200 ease-out lg:hidden",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ width: layout.sidebarWidth }}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold">ST Manager</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav onNavigate={onClose} />
        </div>
      </aside>
    </>
  );
}
