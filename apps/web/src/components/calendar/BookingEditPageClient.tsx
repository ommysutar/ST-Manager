"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { BookingResponseDto } from "@st-manager/contracts";
import type { ClientResponseDto } from "@st-manager/contracts";
import type { StudioResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BookingForm, type BookingFormValues } from "@/components/calendar/BookingForm";
import { useAuth } from "@/hooks/useAuth";
import { bookingsApi, clientsApi, studiosApi } from "@/lib/api-client";

function toPayload(values: BookingFormValues) {
  return {
    studioId: values.studioId,
    clientId: values.clientId || null,
    title: values.title,
    startAt: values.startAt,
    endAt: values.endAt,
    notes: values.notes || null,
  };
}

export function BookingEditPageClient({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [booking, setBooking] = useState<BookingResponseDto | null>(null);
  const [studios, setStudios] = useState<StudioResponseDto[]>([]);
  const [clients, setClients] = useState<ClientResponseDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    Promise.all([
      bookingsApi.getBooking(bookingId),
      studiosApi.listStudios({ page: 1, pageSize: 100 }),
      clientsApi.listClients({ page: 1, pageSize: 100 }),
    ])
      .then(([bookingResponse, studioResponse, clientResponse]) => {
        setBooking(bookingResponse);
        setStudios(studioResponse.data);
        setClients(clientResponse.data);
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "Failed to load booking";
        setError(message);
      });
  }, [bookingId, isAuthenticated]);

  async function handleSubmit(values: BookingFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      await bookingsApi.updateBooking(bookingId, toPayload(values));
      router.push("/calendar");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update booking";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelBooking() {
    setIsSubmitting(true);
    setError(null);

    try {
      await bookingsApi.cancelBooking(bookingId);
      router.push("/calendar");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to cancel booking";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div>
        <Link href="/calendar" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to calendar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit booking</h1>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Sign in to edit bookings.</p>
      ) : !booking ? (
        <p className="text-sm text-muted-foreground">{error ?? "Loading booking..."}</p>
      ) : (
        <BookingForm
          studios={studios}
          clients={clients}
          initialValues={{
            studioId: booking.studioId,
            clientId: booking.clientId ?? "",
            title: booking.title,
            startAt: booking.startAt,
            endAt: booking.endAt,
            notes: booking.notes ?? "",
          }}
          submitLabel="Save booking"
          isSubmitting={isSubmitting}
          error={error}
          studioReadOnly
          onSubmit={handleSubmit}
          onCancelBooking={handleCancelBooking}
        />
      )}
    </div>
  );
}
