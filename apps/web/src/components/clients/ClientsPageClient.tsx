"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { ClientResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@st-manager/ui";
import { MoreHorizontalIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ClientDeleteDialog } from "@/components/clients/ClientDeleteDialog";
import { WhatsAppNotifyIcon } from "@/components/whatsapp/WhatsAppNotifyIcon";
import { useAuth } from "@/hooks/useAuth";
import { useClients } from "@/hooks/useClients";
import { clientHasLinkedRecords, deleteClientWithLinkedData } from "@/lib/clients/delete-client";
import { getClientWhatsAppNumber } from "@/lib/clients/whatsapp";
import { filterClientsBySearch } from "@/lib/inquiry/client-search";

export function ClientsPageClient() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const clients = useClients();
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );
  const [menuClientId, setMenuClientId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientResponseDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canFetch = isAuthenticated && isOnline;

  const visibleClients = useMemo(
    () => (search.trim() ? filterClientsBySearch(clients, search, clients.length || 100) : clients),
    [clients, search],
  );

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

  function openDeleteDialog(client: ClientResponseDto) {
    setMenuClientId(null);
    setDeleteTarget(client);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteClientWithLinkedData(deleteTarget);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to delete client";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

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
            <Link href="/clients/new">Add Client</Link>
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {clients.length === 0 ? (
            <Card>
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm text-muted-foreground">No clients yet.</p>
                <p className="text-sm text-muted-foreground">
                  Click &quot;Add Client&quot; to create your first client.
                </p>
              </CardContent>
            </Card>
          ) : visibleClients.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No matching clients found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleClients.map((client) => (
                <Card
                  key={client.id}
                  className="cursor-pointer transition-colors hover:bg-accent/40"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle>{client.name}</CardTitle>
                        <WhatsAppNotifyIcon
                          whatsappNumber={getClientWhatsAppNumber(client)}
                          type="inquiry_received"
                          variables={{ ClientName: client.name }}
                          size="sm"
                          onClick={(event) => event.stopPropagation()}
                        />
                      </div>
                      <CardDescription>
                        {[client.company, client.email, client.phone].filter(Boolean).join(" · ") ||
                          "No contact details yet"}
                      </CardDescription>
                    </div>
                    <div className="relative shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${client.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuClientId((current) => (current === client.id ? null : client.id));
                        }}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                      {menuClientId === client.id ? (
                        <div className="absolute top-full right-0 z-10 mt-1 min-w-[9rem] rounded-md border border-border bg-popover p-1 shadow-md">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-destructive hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDeleteDialog(client);
                            }}
                          >
                            <Trash2Icon className="size-4" />
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ClientDeleteDialog
        open={deleteTarget !== null}
        client={deleteTarget}
        hasLinkedRecords={deleteTarget ? clientHasLinkedRecords(deleteTarget.id, deleteTarget) : false}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
