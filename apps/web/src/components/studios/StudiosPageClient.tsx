"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { StudioResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import type { Studio } from "@st-manager/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StudioForm } from "@st-manager/ui";
import { useCallback, useEffect, useState } from "react";

import { StudioSummaryActions } from "@/components/ai/StudioSummaryActions";
import { studiosApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

function toStudio(dto: StudioResponseDto): Studio {
  return {
    id: dto.id,
    name: dto.name,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export function StudiosPageClient() {
  const { isAuthenticated } = useAuth();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );

  const aiDisabled = !isAuthenticated || !isOnline;

  const loadStudios = useCallback(async () => {
    setIsLoading(true);
    setListError(null);

    try {
      const response = await studiosApi.listStudios();
      setStudios(response.data.map(toStudio));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to load studios";
      setListError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    studiosApi
      .listStudios()
      .then((response) => {
        if (!cancelled) {
          setStudios(response.data.map(toStudio));
          setListError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof ApiError ? error.message : "Failed to load studios";
          setListError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  async function handleCreate(values: { name: string }) {
    setIsSubmitting(true);
    setFormError(undefined);

    try {
      await studiosApi.createStudio(values);
      await loadStudios();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to create studio";
      setFormError(message);
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
        <h1 className="text-2xl font-semibold tracking-tight">Studios</h1>
        <p className="text-sm text-muted-foreground">Manage your studio workspaces.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading studios...</p>
      ) : listError ? (
        <p className="text-sm text-destructive">{listError}</p>
      ) : studios.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No studios yet. Create the first one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div data-slot="studio-list" className="flex flex-col gap-3">
          {studios.map((studio) => (
            <Card key={studio.id}>
              <CardHeader>
                <CardTitle>{studio.name}</CardTitle>
                <CardDescription>Created {formatDate(studio.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent>
                <StudioSummaryActions
                  studioId={studio.id}
                  name={studio.name}
                  disabled={aiDisabled}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {aiDisabled && isAuthenticated ? (
        <p className="text-sm text-muted-foreground">
          AI summaries require an internet connection.
        </p>
      ) : null}

      {!isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Sign in to create studios and generate summaries.</p>
      ) : null}

      {isAuthenticated ? (
        <StudioForm onSubmit={handleCreate} isSubmitting={isSubmitting} error={formError} />
      ) : null}
    </div>
  );
}
