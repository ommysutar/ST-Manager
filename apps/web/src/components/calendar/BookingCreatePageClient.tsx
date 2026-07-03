"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { ClientResponseDto } from "@st-manager/contracts";
import type { StudioResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export function BookingCreatePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [studios, setStudios] = useState<StudioResponseDto[]>([]);
  const [clients, setClients] = useState<ClientResponseDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    Promise.all([
      studiosApi.listStudios({ page: 1, pageSize: 100 }),
      clientsApi.listClients({ page: 1, pageSize: 100 }),
    ])
      .then(([studioResponse, clientResponse]) => {
        setStudios(studioResponse.data);
        setClients(clientResponse.data);
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "Failed to load form data";
        setError(message);
      });
  }, [isAuthenticated]);

  async function handleSubmit(values: BookingFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const created = await bookingsApi.createBooking(toPayload(values));
      router.push(`/calendar/${created.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create booking";
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New booking</h1>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Sign in to create bookings.</p>
      ) : (
        <BookingForm
          studios={studios}
          clients={clients}
          initialValues={{
            studioId: searchParams.get("studioId") ?? "",
            startAt: searchParams.get("startAt") ?? "",
            endAt: searchParams.get("endAt") ?? "",
          }}
          submitLabel="Create booking"
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
