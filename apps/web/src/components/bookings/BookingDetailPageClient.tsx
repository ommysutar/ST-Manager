"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useBookings } from "@/hooks/useBookings";
import { useStudios } from "@/hooks/useStudios";
import { layout } from "@st-manager/theme";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/constants";
import { cancelBooking } from "@/lib/bookings/storage";
import { getBookingSlotLabel } from "@/lib/bookings/slots";

export function BookingDetailPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const bookings = useBookings();
  const studios = useStudios();
  const booking = useMemo(
    () => bookings.find((entry) => entry.id === params.id),
    [bookings, params.id],
  );
  const studio = studios.find((entry) => entry.id === booking?.studioId);

  if (!isAuthenticated) {
    return <p className="text-sm text-muted-foreground">Sign in to view bookings.</p>;
  }

  if (!booking) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Booking not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/bookings">Back to bookings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function handleCancel() {
    if (!booking) {
      return;
    }

    if (!window.confirm("Cancel this booking?")) {
      return;
    }

    cancelBooking(booking.id);
    toast.success("Booking cancelled");
    router.push("/bookings");
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div>
        <Link href="/bookings" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to bookings
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{booking.bookingFor}</h1>
          <Badge variant={booking.status === "confirmed" ? "success" : "secondary"}>
            {BOOKING_STATUS_LABELS[booking.status]}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Project</p>
            <Link href={`/projects/${booking.projectId}`} className="font-medium hover:underline">
              {booking.projectName}
            </Link>
          </div>
          <div>
            <p className="text-muted-foreground">Client</p>
            <p className="font-medium">{booking.clientName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Studio</p>
            <p className="font-medium">{studio?.name ?? booking.studioId}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">{new Date(`${booking.date}T12:00:00`).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Slot</p>
            <p className="font-medium">{getBookingSlotLabel(booking.slotId)}</p>
          </div>
        </CardContent>
      </Card>

      {booking.status === "confirmed" ? (
        <Button type="button" variant="outline" className="w-fit" onClick={handleCancel}>
          Cancel booking
        </Button>
      ) : null}
    </div>
  );
}
