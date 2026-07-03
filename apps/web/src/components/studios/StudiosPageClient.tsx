"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { StudioResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import type { Studio } from "@st-manager/types";
import { StudioForm, StudioList } from "@st-manager/ui";
import { useCallback, useEffect, useState } from "react";

import { studiosApi } from "@/lib/api-client";

function toStudio(dto: StudioResponseDto): Studio {
  return {
    id: dto.id,
    name: dto.name,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export function StudiosPageClient() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

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
      ) : (
        <StudioList studios={studios} />
      )}

      <StudioForm onSubmit={handleCreate} isSubmitting={isSubmitting} error={formError} />
    </div>
  );
}
