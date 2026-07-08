"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { SessionResponseDto } from "@st-manager/contracts";
import type { ListSessionsResponseDto } from "@st-manager/contracts";
import type { StudioResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { sessionsApi, studiosApi } from "@/lib/api-client";

function formatStatus(status: SessionResponseDto["status"]): string {
  return status.replace("_", " ");
}

function startOfTodayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function endOfTodayIso(): string {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return end.toISOString();
}

export function SessionsPageClient() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<SessionResponseDto[]>([]);
  const [studios, setStudios] = useState<StudioResponseDto[]>([]);
  const [studioId, setStudioId] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loadedFilterKey, setLoadedFilterKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );

  const canFetch = isAuthenticated && isOnline;
  const filterKey = `${studioId}:${status}`;
  const isLoading = canFetch && loadedFilterKey !== filterKey;

  useEffect(() => {
    function handleOnlineChange() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", handleOnlineChange);
    window.addEventListener("offline", handleOnlineChange);

    return () => {
      window.removeEventListener("online", handleOnlineChange);
      window.removeEventListener("offline", handleOnlineChange);
    };
  }, []);

  useEffect(() => {
    if (!canFetch) {
      return;
    }

    void studiosApi.listStudios({ page: 1, pageSize: 100 }).then((response) => {
      setStudios(response.data);
    });
  }, [canFetch]);

  useEffect(() => {
    if (!canFetch) {
      return;
    }

    let cancelled = false;

    sessionsApi
      .listSessions({
        studioId: studioId || undefined,
        status:
          status === "all" ? undefined : (status as SessionResponseDto["status"]),
        from: startOfTodayIso(),
        to: endOfTodayIso(),
        page: 1,
        pageSize: 50,
      })
      .then((response: ListSessionsResponseDto) => {
        if (!cancelled) {
          setSessions(response.data);
          setLoadedFilterKey(filterKey);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : "Failed to load sessions";
          setError(message);
          setLoadedFilterKey(filterKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, filterKey, status, studioId]);

  async function reloadSessions() {
    const response = await sessionsApi.listSessions({
      studioId: studioId || undefined,
      status: status === "all" ? undefined : (status as SessionResponseDto["status"]),
      from: startOfTodayIso(),
      to: endOfTodayIso(),
      page: 1,
      pageSize: 50,
    });
    setSessions(response.data);
    setLoadedFilterKey(filterKey);
  }

  async function handleStart(sessionId: string) {
    setActionId(sessionId);
    setError(null);

    try {
      await sessionsApi.startSession(sessionId);
      await reloadSessions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to start session";
      setError(message);
    } finally {
      setActionId(null);
    }
  }

  async function handleComplete(sessionId: string) {
    setActionId(sessionId);
    setError(null);

    try {
      await sessionsApi.completeSession(sessionId);
      await reloadSessions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to complete session";
      setError(message);
    } finally {
      setActionId(null);
    }
  }

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Track studio use from scheduled start through completion.
          </p>
        </div>
        {canFetch ? (
          <Button asChild>
            <Link href="/sessions/new">New session</Link>
          </Button>
        ) : null}
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sign in to view and manage sessions.</p>
          </CardContent>
        </Card>
      ) : !isOnline ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Sessions require an internet connection to load from the API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="session-filter-studio" className="text-sm font-medium">
                Studio
              </label>
              <select
                id="session-filter-studio"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={studioId}
                onChange={(event) => setStudioId(event.target.value)}
              >
                <option value="">All studios</option>
                {studios.map((studio) => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="session-filter-status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="session-filter-status"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  No sessions for today.{" "}
                  <Link href="/sessions/new" className="text-primary underline-offset-4 hover:underline">
                    Create a session
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      <Link href={`/sessions/${session.id}`} className="hover:underline">
                        {session.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {session.studioName}
                      {session.clientName ? ` · ${session.clientName}` : ""} ·{" "}
                      {formatStatus(session.status)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-3 pt-0">
                    <span className="text-sm text-muted-foreground">
                      {new Date(session.startedAt).toLocaleString()}
                      {session.endedAt
                        ? ` – ${new Date(session.endedAt).toLocaleString()}`
                        : ""}
                    </span>
                    {session.status === "scheduled" ? (
                      <Button
                        size="sm"
                        disabled={actionId === session.id}
                        onClick={() => void handleStart(session.id)}
                      >
                        Start
                      </Button>
                    ) : null}
                    {session.status === "in_progress" ? (
                      <Button
                        size="sm"
                        disabled={actionId === session.id}
                        onClick={() => void handleComplete(session.id)}
                      >
                        Complete
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/sessions/${session.id}`)}
                    >
                      View
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
