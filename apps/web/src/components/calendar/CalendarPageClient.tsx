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

type CalendarView = "week" | "month";

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

          {view === "week" ? (
            <div className="grid gap-4 lg:grid-cols-7">
              {weekDays.map((day) => {
                const dayBookings = bookingsByDay.get(day.toDateString()) ?? [];

                return (
                  <Card key={day.toISOString()}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
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
                    <CardContent className="flex flex-col gap-2">
                      {dayBookings.length > 0 ? (
                        dayBookings.map((booking) => (
                          <Link
                            key={booking.id}
                            href={`/calendar/${booking.id}`}
                            className="rounded-md border border-border p-2 text-sm hover:bg-accent"
                          >
                            <div className="font-medium">{booking.title}</div>
                            <div className="text-muted-foreground">
                              {formatTimeRange(booking.startAt, booking.endAt)}
                            </div>
                          </Link>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No bookings</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Month view</CardTitle>
                <CardDescription>Select a day to focus the week view or add a booking.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <DayPicker
                  mode="single"
                  selected={anchorDate}
                  onSelect={(date) => {
                    if (date) {
                      setAnchorDate(date);
                      setView("week");
                    }
                  }}
                  month={anchorDate}
                  onMonthChange={setAnchorDate}
                  modifiers={{ hasBooking: daysWithBookings }}
                  modifiersClassNames={{ hasBooking: "font-semibold underline" }}
                />
                <ul className="flex flex-col gap-2">
                  {bookings.map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={`/calendar/${booking.id}`}
                        className="text-sm text-primary underline-offset-4 hover:underline"
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
