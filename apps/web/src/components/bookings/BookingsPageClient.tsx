"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useBookings } from "@/hooks/useBookings";
import { useStudios } from "@/hooks/useStudios";
import { addDays, startOfWeek } from "@/lib/calendar-utils";
import { layout } from "@st-manager/theme";
import { BOOKING_SLOTS, BOOKING_STATUS_LABELS } from "@/lib/bookings/constants";
import type { ProjectBooking } from "@/lib/bookings/types";

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDayString(day: Date, isoDate: string): boolean {
  return toDateKey(day) === isoDate;
}

export function BookingsPageClient() {
  const { isAuthenticated } = useAuth();
  const bookings = useBookings();
  const studios = useStudios();
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const confirmedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "confirmed"),
    [bookings],
  );

  function bookingsForDay(day: Date): ProjectBooking[] {
    return confirmedBookings.filter((booking) => isSameDayString(day, booking.date));
  }

  function shiftWeek(direction: -1 | 1) {
    setAnchorDate((current) => addDays(current, direction * 7));
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to manage bookings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Project-owned studio bookings with fixed daily slots.
          </p>
        </div>
        <Button asChild>
          <Link href="/bookings/new">
            <PlusIcon className="size-4" />
            New Booking
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => shiftWeek(-1)}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => shiftWeek(1)}>
            <ChevronRightIcon className="size-4" />
          </Button>
          <span className="text-sm font-medium">
            {formatDayLabel(weekDays[0])} – {formatDayLabel(weekDays[6])}
          </span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAnchorDate(new Date())}>
          This week
        </Button>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[980px] gap-4">
          {weekDays.map((day) => {
            const dayBookings = bookingsForDay(day);
            const isToday = isSameDayString(day, toDateKey(new Date()));

            return (
              <Card
                key={day.toISOString()}
                className={`min-h-[28rem] min-w-[14rem] flex-1 overflow-hidden border-border/60 shadow-md ${
                  isToday ? "ring-2 ring-primary/30" : ""
                }`}
              >
                <CardHeader className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent pb-4">
                  <CardTitle className="text-base">{formatDayLabel(day)}</CardTitle>
                  <Link
                    href={`/bookings/new?date=${toDateKey(day)}`}
                    className="text-xs text-primary underline-offset-4 hover:underline"
                  >
                    Add booking
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  {BOOKING_SLOTS.map((slot) => {
                    const slotBooking = dayBookings.find((booking) => booking.slotId === slot.id);
                    const studioName = studios.find((studio) => studio.id === slotBooking?.studioId)?.name;

                    return (
                      <div
                        key={slot.id}
                        className="rounded-xl border border-border/60 bg-background/60 p-3"
                      >
                        <p className="text-xs font-medium text-muted-foreground">{slot.label}</p>
                        {slotBooking ? (
                          <Link
                            href={`/bookings/${slotBooking.id}`}
                            className="mt-2 block rounded-lg border border-primary/20 bg-primary/5 p-2 transition-colors hover:bg-primary/10"
                          >
                            <p className="text-sm font-medium">{slotBooking.bookingFor}</p>
                            <p className="text-xs text-muted-foreground">{slotBooking.projectName}</p>
                            <p className="text-xs text-muted-foreground">{studioName}</p>
                            <Badge variant="success" className="mt-2">
                              {BOOKING_STATUS_LABELS[slotBooking.status]}
                            </Badge>
                          </Link>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">Available</p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
