"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useMemo } from "react";

import { useBookings } from "@/hooks/useBookings";
import { useStudios } from "@/hooks/useStudios";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/constants";
import { getBookingSlotLabel } from "@/lib/bookings/slots";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingsWidget() {
  const bookings = useBookings();
  const studios = useStudios();

  const { todayBookings, upcomingBookings } = useMemo(() => {
    const confirmed = bookings.filter((booking) => booking.status === "confirmed");
    const today = todayIso();

    return {
      todayBookings: confirmed.filter((booking) => booking.date === today),
      upcomingBookings: confirmed
        .filter((booking) => booking.date > today)
        .slice(0, 5),
    };
  }, [bookings]);

  function renderBookingList(items: typeof todayBookings, emptyLabel: string) {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    }

    return (
      <ul className="space-y-3">
        {items.map((booking) => (
          <li key={booking.id}>
            <Link
              href={`/bookings/${booking.id}`}
              className="block rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{booking.projectName}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.clientName} · {studios.find((s) => s.id === booking.studioId)?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getBookingSlotLabel(booking.slotId)} · {booking.bookingFor}
                  </p>
                </div>
                <Badge variant="success">{BOOKING_STATUS_LABELS[booking.status]}</Badge>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card className="border-border/60 bg-background/60 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base">Today&apos;s &amp; Upcoming Bookings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-medium">Today&apos;s Bookings</p>
          {renderBookingList(todayBookings, "No bookings scheduled for today.")}
        </div>
        <div>
          <p className="mb-3 text-sm font-medium">Upcoming Bookings</p>
          {renderBookingList(upcomingBookings, "No upcoming bookings.")}
        </div>
      </CardContent>
    </Card>
  );
}
