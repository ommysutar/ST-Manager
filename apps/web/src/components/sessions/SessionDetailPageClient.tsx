"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { SessionResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Button } from "@st-manager/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { sessionsApi, invoicesApi } from "@/lib/api-client";

function formatStatus(status: SessionResponseDto["status"]): string {
  return status.replace("_", " ");
}

export function SessionDetailPageClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [session, setSession] = useState<SessionResponseDto | null>(null);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    Promise.all([
      sessionsApi.getSession(sessionId),
      invoicesApi.listInvoices({ sessionId, page: 1, pageSize: 1 }),
    ])
      .then(([response, invoiceResponse]) => {
        setSession(response);
        setNotes(response.notes ?? "");
        setLinkedInvoiceId(invoiceResponse.data[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        const message = err instanceof ApiError ? err.message : "Failed to load session";
        setError(message);
      });
  }, [isAuthenticated, sessionId]);

  async function refreshSession() {
    const response = await sessionsApi.getSession(sessionId);
    setSession(response);
    setNotes(response.notes ?? "");
  }

  async function handleSaveNotes() {
    if (!session || session.status !== "scheduled") {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await sessionsApi.updateSession(sessionId, { notes: notes || null });
      await refreshSession();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update session";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStart() {
    setIsSubmitting(true);
    setError(null);

    try {
      await sessionsApi.startSession(sessionId);
      await refreshSession();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to start session";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleComplete() {
    setIsSubmitting(true);
    setError(null);

    try {
      await sessionsApi.completeSession(sessionId);
      await refreshSession();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to complete session";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    setIsSubmitting(true);
    setError(null);

    try {
      await sessionsApi.cancelSession(sessionId);
      router.push("/sessions");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to cancel session";
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
        <Link href="/sessions" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to sessions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Session detail</h1>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Sign in to view sessions.</p>
      ) : !session ? (
        <p className="text-sm text-muted-foreground">{error ?? "Loading session..."}</p>
      ) : (
        <div className="flex max-w-xl flex-col gap-4">
          <div className="rounded-md border border-border p-4 text-sm">
            <p className="font-medium">{session.title}</p>
            <p className="mt-2 text-muted-foreground">
              {session.studioName}
              {session.clientName ? ` · ${session.clientName}` : ""}
            </p>
            <p className="mt-2 text-muted-foreground">Status: {formatStatus(session.status)}</p>
            <p className="mt-2 text-muted-foreground">
              Started: {new Date(session.startedAt).toLocaleString()}
            </p>
            {session.endedAt ? (
              <p className="mt-2 text-muted-foreground">
                Ended: {new Date(session.endedAt).toLocaleString()}
              </p>
            ) : null}
            {session.status === "completed" && session.clientId ? (
              <p className="mt-2">
                {linkedInvoiceId ? (
                  <Link
                    href={`/billing/${linkedInvoiceId}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    View invoice
                  </Link>
                ) : (
                  <Link
                    href={`/billing/new?sessionId=${session.id}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Create invoice from session
                  </Link>
                )}
              </p>
            ) : null}
            {session.bookingId ? (
              <p className="mt-2 text-muted-foreground">
                Linked to legacy API booking {session.bookingId} (not part of the Bookings module).
              </p>
            ) : null}
          </div>

          {session.status === "scheduled" ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="session-notes" className="text-sm font-medium">
                Notes
              </label>
              <textarea
                id="session-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button disabled={isSubmitting} onClick={() => void handleSaveNotes()}>
                Save notes
              </Button>
            </div>
          ) : session.notes ? (
            <p className="text-sm text-muted-foreground">Notes: {session.notes}</p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            {session.status === "scheduled" ? (
              <Button disabled={isSubmitting} onClick={() => void handleStart()}>
                Start session
              </Button>
            ) : null}
            {session.status === "in_progress" ? (
              <Button disabled={isSubmitting} onClick={() => void handleComplete()}>
                Complete session
              </Button>
            ) : null}
            {session.status === "scheduled" || session.status === "in_progress" ? (
              <Button variant="outline" disabled={isSubmitting} onClick={() => void handleCancel()}>
                Cancel session
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
