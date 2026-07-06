"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cn } from "@st-manager/ui";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useBookings } from "@/hooks/useBookings";
import { useBookingSlots } from "@/hooks/useBookingSlots";
import { useStudios } from "@/hooks/useStudios";
import { addDays, startOfWeek } from "@/lib/calendar-utils";
import { layout } from "@st-manager/theme";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/constants";
import { rescheduleBooking } from "@/lib/bookings/storage";
import type { BookingSlotId, ProjectBooking } from "@/lib/bookings/types";

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
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const bookings = useBookings();
  const studios = useStudios();
  const slots = useBookingSlots();
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [studioFilter, setStudioFilter] = useState<string>("all");
  const [dragBookingId, setDragBookingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; slotId: BookingSlotId } | null>(
    null,
  );

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const visibleBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        if (booking.status === "cancelled") return false;
        if (studioFilter !== "all" && booking.studioId !== studioFilter) return false;
        return true;
      }),
    [bookings, studioFilter],
  );

  function bookingsForDaySlot(day: Date, slotId: BookingSlotId): ProjectBooking[] {
    return visibleBookings.filter(
      (booking) => isSameDayString(day, booking.date) && booking.slotId === slotId,
    );
  }

  function shiftWeek(direction: -1 | 1) {
    setAnchorDate((current) => addDays(current, direction * 7));
  }

  function handleDrop(day: Date, slotId: BookingSlotId) {
    setDropTarget(null);
    if (!dragBookingId) {
      return;
    }

    const date = toDateKey(day);
    const booking = bookings.find((entry) => entry.id === dragBookingId);
    setDragBookingId(null);

    if (!booking || (booking.date === date && booking.slotId === slotId)) {
      return;
    }

    try {
      rescheduleBooking(booking.id, date, slotId);
      toast.success("Booking rescheduled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reschedule booking");
    }
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
            Project-owned studio bookings. Drag a booking to reschedule it.
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
          <Button type="button" variant="ghost" size="sm" onClick={() => setAnchorDate(new Date())}>
            This week
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Studio</span>
          <select
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={studioFilter}
            onChange={(event) => setStudioFilter(event.target.value)}
          >
            <option value="all">All Studios</option>
            {studios.map((studio) => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[1120px] gap-4">
          {weekDays.map((day) => {
            const isToday = isSameDayString(day, toDateKey(new Date()));
            const dateKey = toDateKey(day);

            return (
              <Card
                key={day.toISOString()}
                className={cn(
                  "min-h-[32rem] min-w-[15rem] flex-1 overflow-hidden border-border/60 shadow-md",
                  isToday && "ring-2 ring-primary/30",
                )}
              >
                <CardHeader className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent pb-4">
                  <CardTitle className="text-base">{formatDayLabel(day)}</CardTitle>
                  <Link
                    href={`/bookings/new?date=${dateKey}`}
                    className="text-xs text-primary underline-offset-4 hover:underline"
                  >
                    Add booking
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  {slots.map((slot) => {
                    const cellBookings = bookingsForDaySlot(day, slot.id);
                    const isDropTarget =
                      dropTarget?.date === dateKey && dropTarget.slotId === slot.id;

                    return (
                      <div
                        key={slot.id}
                        onDragOver={(event) => {
                          if (!dragBookingId) return;
                          event.preventDefault();
                          setDropTarget({ date: dateKey, slotId: slot.id });
                        }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleDrop(day, slot.id);
                        }}
                        className={cn(
                          "space-y-2 rounded-xl border border-border/60 bg-background/60 p-3 transition-colors",
                          isDropTarget && "border-primary/50 bg-primary/10",
                        )}
                      >
                        <p className="text-xs font-medium text-muted-foreground">{slot.label}</p>
                        {cellBookings.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Available</p>
                        ) : (
                          cellBookings.map((booking) => {
                            const bookingStudio = studios.find((s) => s.id === booking.studioId);

                            return (
                              <div
                                key={booking.id}
                                role="button"
                                tabIndex={0}
                                draggable
                                onClick={() => router.push(`/bookings/${booking.id}`)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") router.push(`/bookings/${booking.id}`);
                                }}
                                onDragStart={(event) => {
                                  setDragBookingId(booking.id);
                                  event.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={() => {
                                  setDragBookingId(null);
                                  setDropTarget(null);
                                }}
                                className={cn(
                                  "cursor-grab rounded-lg border p-2 transition-colors active:cursor-grabbing",
                                  dragBookingId === booking.id
                                    ? "opacity-50"
                                    : "border-primary/20 bg-primary/5 hover:bg-primary/10",
                                )}
                                style={{
                                  borderLeftColor: bookingStudio?.color ?? undefined,
                                  borderLeftWidth: bookingStudio ? "3px" : undefined,
                                }}
                              >
                                <p className="text-sm font-medium">{booking.bookingFor}</p>
                                <p className="text-xs text-muted-foreground">{booking.projectName}</p>
                                <p className="text-xs text-muted-foreground">{bookingStudio?.name}</p>
                                <Badge
                                  variant={booking.status === "draft" ? "outline" : "success"}
                                  className="mt-2"
                                >
                                  {BOOKING_STATUS_LABELS[booking.status]}
                                </Badge>
                              </div>
                            );
                          })
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
