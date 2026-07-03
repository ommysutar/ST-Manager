import { layout } from "@st-manager/theme";
import type { Studio } from "@st-manager/types";
import { StudioForm, StudioList } from "@st-manager/ui";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../hooks/useAuth";
import { emitStudioCreatedLocally, requestSync, subscribeSyncEngineState } from "../../lib/sync-engine";
import {
  createLocalStudio,
  listLocalStudios,
  type LocalStudioDto,
} from "../../lib/tauri/studios";

function toStudio(dto: LocalStudioDto): Studio {
  return {
    id: dto.id,
    name: dto.name,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

async function fetchLocalStudios(): Promise<Studio[]> {
  const response = await listLocalStudios();
  return response.map(toStudio);
}

export function StudiosPage() {
  const { isAuthenticated } = useAuth();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const reloadStudios = useCallback(async () => {
    try {
      const next = await fetchLocalStudios();
      setStudios(next);
      setListError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load studios";
      setListError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchLocalStudios()
      .then((next) => {
        if (!cancelled) {
          setStudios(next);
          setListError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load studios";
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
    return subscribeSyncEngineState(() => {
      void reloadStudios();
    });
  }, [reloadStudios]);

  async function handleCreate(values: { name: string }) {
    setIsSubmitting(true);
    setFormError(undefined);

    try {
      const created = await createLocalStudio(values.name);
      emitStudioCreatedLocally({
        id: created.id,
        name: created.name,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });
      await reloadStudios();

      if (isAuthenticated && navigator.onLine) {
        requestSync();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create studio";
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

      {isAuthenticated ? (
        <StudioForm onSubmit={handleCreate} isSubmitting={isSubmitting} error={formError} />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to create studios.</p>
      )}
    </div>
  );
}
