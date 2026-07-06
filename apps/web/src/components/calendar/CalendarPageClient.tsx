"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { BookingResponseDto } from "@st-manager/contracts";
import type { StudioResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  addDays,
  buildNewBookingHref,
  formatTimeRange,
  startOfMonth,
  startOfNextMonth,
  startOfWeek,
} from "@/lib/calendar-utils";
import { bookingsApi, studiosApi } from "@/lib/api-client";

type CalendarView = "day" | "week" | "month";

function groupBookingsByDay(bookings: BookingResponseDto[]): Map<string, BookingResponseDto[]> {
  const grouped = new Map<string, BookingResponseDto[]>();

  for (const booking of bookings) {
    const key = new Date(booking.startAt).toDateString();
    const existing = grouped.get(key) ?? [];
    existing.push(booking);
    grouped.set(key, existing);
  }

  return grouped;
}

export function CalendarPageClient() {
  const { isAuthenticated } = useAuth();
  const [studios, setStudios] = useState<StudioResponseDto[]>([]);
  const [selectedStudioId, setSelectedStudioId] = useState("");
  const [view, setView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedRangeKey, setLoadedRangeKey] = useState<string | null>(null);

  const range = useMemo(() => {
    if (view === "day") {
      const from = new Date(anchorDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      return { from, to };
    }

    if (view === "week") {
      const from = startOfWeek(anchorDate);
      return { from, to: addDays(from, 7) };
    }

    const from = startOfMonth(anchorDate);
    return { from, to: startOfNextMonth(anchorDate) };
  }, [anchorDate, view]);

  const rangeKey = `${selectedStudioId}:${range.from.toISOString()}:${range.to.toISOString()}`;
  const canLoadBookings = isAuthenticated && Boolean(selectedStudioId);
  const isLoading = canLoadBookings && loadedRangeKey !== rangeKey && error === null;

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [anchorDate]);

  const bookingsByDay = useMemo(() => groupBookingsByDay(bookings), [bookings]);
  const daysWithBookings = useMemo(
    () => Array.from(bookingsByDay.keys()).map((value) => new Date(value)),
    [bookingsByDay],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    studiosApi
      .listStudios({ page: 1, pageSize: 100 })
      .then((response) => {
        setStudios(response.data);
        setSelectedStudioId((current) => current || response.data[0]?.id || "");
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "Failed to load studios";
        setError(message);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!canLoadBookings) {
      return;
    }

    let cancelled = false;

    bookingsApi
      .listBookings({
        studioId: selectedStudioId,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      })
      .then((response) => {
        if (!cancelled) {
          setBookings(response.data);
          setLoadedRangeKey(rangeKey);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : "Failed to load bookings";
          setError(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canLoadBookings, selectedStudioId, range.from, range.to, rangeKey]);

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            View and manage studio bookings with conflict detection.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={view === "day" ? "default" : "outline"}
            onClick={() => setView("day")}
          >
            Day
          </Button>
          <Button
            type="button"
            variant={view === "week" ? "default" : "outline"}
            onClick={() => setView("week")}
          >
            Week
          </Button>
          <Button
            type="button"
            variant={view === "month" ? "default" : "outline"}
            onClick={() => setView("month")}
          >
            Month
          </Button>
        </div>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sign in to manage bookings.</p>
          </CardContent>
        </Card>
      ) : studios.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Create a studio before scheduling bookings.{" "}
              <Link href="/studios" className="text-primary underline-offset-4 hover:underline">
                Go to studios
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:max-w-sm">
            <label htmlFor="calendar-studio" className="text-sm font-medium">
              Studio
            </label>
            <select
              id="calendar-studio"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedStudioId}
              onChange={(event) => setSelectedStudioId(event.target.value)}
            >
              {studios.map((studio) => (
                <option key={studio.id} value={studio.id}>
                  {studio.name}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Loading bookings...</p> : null}

          {view === "day" ? (
            <Card className="overflow-hidden border-border/60 shadow-lg">
              <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="text-lg">
                  {anchorDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
                <CardDescription>
                  <Link
                    href={buildNewBookingHref(selectedStudioId, anchorDate)}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Add booking
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[28rem] space-y-3 p-6">
                {(bookingsByDay.get(anchorDate.toDateString()) ?? []).length > 0 ? (
                  (bookingsByDay.get(anchorDate.toDateString()) ?? []).map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/calendar/${booking.id}`}
                      className="block rounded-xl border border-border/60 bg-background/60 p-4 text-sm shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="font-medium">{booking.title}</div>
                      <div className="text-muted-foreground">
                        {formatTimeRange(booking.startAt, booking.endAt)}
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="py-16 text-center text-sm text-muted-foreground">No bookings scheduled</p>
                )}
              </CardContent>
            </Card>
          ) : view === "week" ? (
            <div className="grid gap-4 lg:grid-cols-7">
              {weekDays.map((day) => {
                const dayBookings = bookingsByDay.get(day.toDateString()) ?? [];
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                  <Card
                    key={day.toISOString()}
                    className={`min-h-[20rem] overflow-hidden border-border/60 shadow-md ${
                      isToday ? "ring-2 ring-primary/30" : ""
                    }`}
                  >
                    <CardHeader className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent pb-4">
                      <CardTitle className="text-base">
                        {day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </CardTitle>
                      <CardDescription>
                        <Link
                          href={buildNewBookingHref(selectedStudioId, day)}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Add booking
                        </Link>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex min-h-[16rem] flex-col gap-3 p-4">
                      {dayBookings.length > 0 ? (
                        dayBookings.map((booking) => (
                          <Link
                            key={booking.id}
                            href={`/calendar/${booking.id}`}
                            className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                          >
                            <div className="font-medium">{booking.title}</div>
                            <div className="text-muted-foreground">
                              {formatTimeRange(booking.startAt, booking.endAt)}
                            </div>
                          </Link>
                        ))
                      ) : (
                        <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                          No bookings
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="overflow-hidden border-border/60 shadow-lg">
              <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-base">Month view</CardTitle>
                <CardDescription>Select a day to focus the week view or add a booking.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 p-6">
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4 [&_.rdp]:mx-auto [&_.rdp-day]:min-h-12 [&_.rdp-day]:min-w-12 [&_.rdp-day_button]:h-12 [&_.rdp-day_button]:w-12 [&_.rdp-day_button]:rounded-xl [&_.rdp-day_button]:text-base">
                  <DayPicker
                    mode="single"
                    selected={anchorDate}
                    onSelect={(date) => {
                      if (date) {
                        setAnchorDate(date);
                        setView("day");
                      }
                    }}
                    month={anchorDate}
                    onMonthChange={setAnchorDate}
                    modifiers={{ hasBooking: daysWithBookings }}
                    modifiersClassNames={{ hasBooking: "font-semibold underline decoration-primary" }}
                  />
                </div>
                <ul className="flex flex-col gap-3">
                  {bookings.map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={`/calendar/${booking.id}`}
                        className="block rounded-xl border border-border/60 p-3 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                      >
                        {booking.title} — {new Date(booking.startAt).toLocaleDateString()} (
                        {formatTimeRange(booking.startAt, booking.endAt)})
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
