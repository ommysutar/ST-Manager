"use client";

import type { ProjectBookingStatus } from "@/lib/bookings/types";

export function bookingStatusStyles(status: ProjectBookingStatus): string {
  switch (status) {
    case "booked":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100";
    case "completed":
      return "border-sky-500/40 bg-sky-500/15 text-sky-900 dark:text-sky-100";
    case "draft":
      return "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-100";
    case "cancelled":
      return "border-muted-foreground/30 bg-muted/40 text-muted-foreground";
    default:
      return "border-border/60 bg-muted/30";
  }
}

export function bookingStatusDotColor(status: ProjectBookingStatus): string {
  switch (status) {
    case "booked":
      return "bg-emerald-500";
    case "completed":
      return "bg-sky-500";
    case "draft":
      return "bg-amber-500";
    case "cancelled":
      return "bg-muted-foreground";
    default:
      return "bg-primary";
  }
}
