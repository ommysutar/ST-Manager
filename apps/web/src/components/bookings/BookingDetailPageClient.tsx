"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useBookings } from "@/hooks/useBookings";
import { useStudios } from "@/hooks/useStudios";
import { layout } from "@st-manager/theme";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_OPTIONS } from "@/lib/bookings/constants";
import { cancelBooking, updateBooking } from "@/lib/bookings/storage";
import { getBookingSlotLabel } from "@/lib/bookings/slots";
import type { ProjectBookingStatus } from "@/lib/bookings/types";

import { ProjectBookingForm, type ProjectBookingFormValues } from "./BookingCreatePageClient";

function statusBadgeVariant(status: ProjectBookingStatus): "success" | "secondary" | "outline" {
  if (status === "booked" || status === "completed") return "success";
  if (status === "cancelled") return "secondary";
  return "outline";
}

export function BookingDetailPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const bookings = useBookings();
  const studios = useStudios();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
    router.refresh();
  }

  function handleStatusChange(status: ProjectBookingStatus) {
    if (!booking) {
      return;
    }
    try {
      updateBooking(booking.id, { status });
      toast.success("Booking status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update status");
    }
  }

  async function handleEditSubmit(values: ProjectBookingFormValues) {
    if (!booking) {
      return;
    }
    setIsSaving(true);
    try {
      updateBooking(booking.id, {
        studioId: values.studioId,
        bookingFor: values.bookingFor,
        notes: values.notes,
        date: values.date,
        slotId: values.slotId,
        status: values.status,
      });
      toast.success("Booking updated");
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update booking");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div>
        <Link href="/bookings" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to bookings
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{booking.bookingFor}</h1>
          <Badge variant={statusBadgeVariant(booking.status)}>
            {BOOKING_STATUS_LABELS[booking.status]}
          </Badge>
        </div>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectBookingForm
              initialValues={{
                projectId: booking.projectId,
                studioId: booking.studioId,
                bookingFor: booking.bookingFor,
                notes: booking.notes,
                date: booking.date,
                slotId: booking.slotId,
                status: booking.status,
              }}
              excludeBookingId={booking.id}
              lockProject
              submitLabel="Save Changes"
              isSubmitting={isSaving}
              onSubmit={handleEditSubmit}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setIsEditing(false)}
            >
              Cancel editing
            </Button>
          </CardContent>
        </Card>
      ) : (
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
              <p className="flex items-center gap-2 font-medium">
                {studio ? (
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: studio.color }}
                    aria-hidden
                  />
                ) : null}
                {studio?.name ?? booking.studioId}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{new Date(`${booking.date}T12:00:00`).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Slot</p>
              <p className="font-medium">{getBookingSlotLabel(booking.slotId)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p className="font-medium whitespace-pre-wrap">{booking.notes || "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isEditing ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <select
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={booking.status}
              onChange={(event) => handleStatusChange(event.target.value as ProjectBookingStatus)}
            >
              {BOOKING_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            Edit booking
          </Button>
          {booking.status !== "cancelled" ? (
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel booking
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
