"use client";

import type { ClientResponseDto } from "@st-manager/contracts";
import type { StudioResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { SessionForm, type SessionFormValues } from "@/components/sessions/SessionForm";
import { useAuth } from "@/hooks/useAuth";
import { bookingsApi, clientsApi, sessionsApi, studiosApi } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";

function toPayload(values: SessionFormValues) {
  return {
    studioId: values.studioId,
    clientId: values.clientId || null,
    title: values.title,
    startedAt: values.startedAt,
    notes: values.notes || null,
  };
}

export function SessionCreatePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const { isAuthenticated } = useAuth();
  const [studios, setStudios] = useState<StudioResponseDto[]>([]);
  const [clients, setClients] = useState<ClientResponseDto[]>([]);
  const [initialValues, setInitialValues] = useState<Partial<SessionFormValues>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(!bookingId);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    Promise.all([
      studiosApi.listStudios({ page: 1, pageSize: 100 }),
      clientsApi.listClients({ page: 1, pageSize: 100 }),
      bookingId ? bookingsApi.getBooking(bookingId) : Promise.resolve(null),
    ])
      .then(([studioResponse, clientResponse, booking]) => {
        setStudios(studioResponse.data);
        setClients(clientResponse.data);

        if (booking) {
          setInitialValues({
            studioId: booking.studioId,
            clientId: booking.clientId ?? "",
            title: booking.title,
            startedAt: booking.startAt,
            notes: booking.notes ?? "",
          });
        }

        setIsReady(true);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Failed to load form data"));
        setIsReady(true);
      });
  }, [bookingId, isAuthenticated]);

  async function handleSubmit(values: SessionFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const session = await sessionsApi.createSession(
        bookingId ? { bookingId } : toPayload(values),
      );
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create session"));
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
        <Link href="/sessions" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to sessions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {bookingId ? "Start session from booking" : "New session"}
        </h1>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Sign in to create sessions.</p>
      ) : !isReady ? (
        <p className="text-sm text-muted-foreground">Loading form...</p>
      ) : bookingId ? (
        <>
          <p className="text-sm text-muted-foreground">
            This will create a scheduled session linked to the booking.
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <SessionForm
            studios={studios}
            clients={clients}
            initialValues={initialValues}
            submitLabel="Create session"
            isSubmitting={isSubmitting}
            error={error}
            studioReadOnly
            onSubmit={handleSubmit}
          />
        </>
      ) : (
        <SessionForm
          studios={studios}
          clients={clients}
          initialValues={initialValues}
          submitLabel="Create session"
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
