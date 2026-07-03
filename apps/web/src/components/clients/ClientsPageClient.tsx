"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { ClientResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@st-manager/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { clientsApi } from "@/lib/api-client";

export function ClientsPageClient() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [clients, setClients] = useState<ClientResponseDto[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );

  const canFetch = isAuthenticated && isOnline;

  const loadClients = useCallback(async (searchTerm: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await clientsApi.listClients(
        searchTerm.trim() ? { search: searchTerm.trim() } : {},
      );
      setClients(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load clients";
      setError(message);
    } finally {
      setIsLoading(false);
    }
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

  useEffect(() => {
    if (!canFetch) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadClients(search);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [canFetch, loadClients, search]);

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage client contacts for bookings, sessions, and billing.
          </p>
        </div>
        {canFetch ? (
          <Button asChild>
            <Link href="/clients/new">Add client</Link>
          </Button>
        ) : null}
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sign in to view and manage clients.</p>
          </CardContent>
        </Card>
      ) : !isOnline ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Clients require an internet connection to load from the API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients by name"
          />

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading clients...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : clients.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  No clients yet.{" "}
                  <Link href="/clients/new" className="text-primary underline-offset-4 hover:underline">
                    Add your first client
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {clients.map((client) => (
                <Card
                  key={client.id}
                  className="cursor-pointer transition-colors hover:bg-accent/40"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <CardHeader>
                    <CardTitle>{client.name}</CardTitle>
                    <CardDescription>
                      {[client.company, client.email, client.phone].filter(Boolean).join(" · ") ||
                        "No contact details yet"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
