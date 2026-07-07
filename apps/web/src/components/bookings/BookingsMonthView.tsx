"use client";

import { cn } from "@st-manager/ui";

import {
  getMonthGrid,
  isSameDay,
  isSameMonth,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/calendar-utils";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/constants";
import { bookingStatusDotColor, bookingStatusStyles } from "@/lib/bookings/calendar-styles";
import type { ProjectBooking } from "@/lib/bookings/types";
import type { StudioRoom } from "@/lib/studios/types";

interface BookingsMonthViewProps {
  anchorDate: Date;
  bookings: ProjectBooking[];
  studios: StudioRoom[];
  dragBookingId: string | null;
  dropTargetDate: string | null;
  onDayClick: (day: Date) => void;
  onBookingClick: (booking: ProjectBooking, event: React.MouseEvent) => void;
  onDragStart: (bookingId: string, event: React.DragEvent) => void;
  onDragEnd: () => void;
  onDayDragOver: (dateKey: string, event: React.DragEvent) => void;
  onDayDragLeave: () => void;
  onDayDrop: (day: Date, event: React.DragEvent) => void;
}

function uniqueStudioNames(bookings: ProjectBooking[], studios: StudioRoom[]): string[] {
  const names = new Set<string>();
  for (const booking of bookings) {
    const studio = studios.find((entry) => entry.id === booking.studioId);
    if (studio?.name) {
      names.add(studio.name);
    }
  }
  return [...names];
}

export function BookingsMonthView({
  anchorDate,
  bookings,
  studios,
  dragBookingId,
  dropTargetDate,
  onDayClick,
  onBookingClick,
  onDragStart,
  onDragEnd,
  onDayDragOver,
  onDayDragLeave,
  onDayDrop,
}: BookingsMonthViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthDays = getMonthGrid(anchorDate);

  function bookingsForDay(day: Date): ProjectBooking[] {
    const key = toDateKey(day);
    return bookings.filter((booking) => booking.date === key);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-lg backdrop-blur-sm">
      <div className="grid grid-cols-7 border-b border-border/50 bg-muted/20">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7"
        style={{ gridTemplateRows: `repeat(${monthDays.length / 7}, minmax(7.5rem, auto))` }}
      >
        {monthDays.map((day) => {
          const dateKey = toDateKey(day);
          const dayBookings = bookingsForDay(day);
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, anchorDate);
          const isDropTarget = dropTargetDate === dateKey;
          const studioNames = uniqueStudioNames(dayBookings, studios);
          const visibleBookings = dayBookings.slice(0, 3);
          const overflowCount = dayBookings.length - visibleBookings.length;

          return (
            <div
              key={dateKey}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(day)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onDayClick(day);
                }
              }}
              onDragOver={(event) => onDayDragOver(dateKey, event)}
              onDragLeave={onDayDragLeave}
              onDrop={(event) => onDayDrop(day, event)}
              className={cn(
                "group relative flex min-h-[7.5rem] flex-col border-b border-r border-border/40 p-2 transition-colors",
                "hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
                !inMonth && "bg-muted/10",
                isDropTarget && "bg-primary/10 ring-2 ring-inset ring-primary/40",
                isToday && "bg-primary/[0.06]",
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                    isToday && "bg-primary text-primary-foreground shadow-sm",
                    !isToday && inMonth && "text-foreground",
                    !isToday && !inMonth && "text-muted-foreground/60",
                  )}
                >
                  {day.getDate()}
                </span>
                {dayBookings.length > 0 ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {dayBookings.length}
                  </span>
                ) : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                {visibleBookings.map((booking) => {
                  const studio = studios.find((entry) => entry.id === booking.studioId);

                  return (
                    <div
                      key={booking.id}
                      draggable
                      onClick={(event) => onBookingClick(booking, event)}
                      onDragStart={(event) => onDragStart(booking.id, event)}
                      onDragEnd={onDragEnd}
                      className={cn(
                        "cursor-grab truncate rounded-md border px-1.5 py-1 text-[10px] leading-tight active:cursor-grabbing",
                        bookingStatusStyles(booking.status),
                        dragBookingId === booking.id && "opacity-50",
                      )}
                      style={{
                        borderLeftWidth: studio ? "3px" : undefined,
                        borderLeftColor: studio?.color ?? undefined,
                      }}
                      title={`${booking.projectName} · ${BOOKING_STATUS_LABELS[booking.status]}`}
                    >
                      <span className="flex items-center gap-1">
                        <span
                          className={cn("size-1.5 shrink-0 rounded-full", bookingStatusDotColor(booking.status))}
                          aria-hidden
                        />
                        <span className="truncate font-medium">{booking.projectName}</span>
                      </span>
                      {studio ? (
                        <span className="mt-0.5 block truncate opacity-80">{studio.name}</span>
                      ) : null}
                    </div>
                  );
                })}

                {overflowCount > 0 ? (
                  <p className="text-[10px] font-medium text-muted-foreground">+{overflowCount} more</p>
                ) : null}

                {studioNames.length > 0 && dayBookings.length <= 3 ? (
                  <p className="mt-auto truncate text-[10px] text-muted-foreground/80">
                    {studioNames.join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
