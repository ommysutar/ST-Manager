"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { ClientResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import { Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ClientDeleteDialog } from "@/components/clients/ClientDeleteDialog";
import { ClientForm, type ClientFormValues } from "@/components/clients/ClientForm";
import { useAuth } from "@/hooks/useAuth";
import { useClientPaymentsSummary } from "@/hooks/useClientPaymentsSummary";
import { clientsApi } from "@/lib/api-client";
import {
  clientHasLinkedRecords,
  deleteClientWithLinkedData,
} from "@/lib/clients/delete-client";
import { propagateClientDetailsToLocalRecords } from "@/lib/clients/sync";
import { toClientUpdatePayload } from "@/lib/clients/normalize-client-payload";
import { isTestOrDemoClient } from "@/lib/clients/smoke-clients";
import { notifyClientsUpdated } from "@/lib/clients/events";
import { upsertClientInSnapshot } from "@/lib/clients/store";
import { formatINR } from "@/lib/currency";
import { PAYMENT_STATUS_LABELS, getPaymentStatus } from "@/lib/payments/status";

function toFormValues(client: ClientResponseDto): ClientFormValues {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    whatsappNumber: client.whatsappNumber ?? "",
    whatsappSameAsPhone: client.whatsappSameAsPhone ?? false,
    company: client.company ?? "",
    notes: client.notes ?? "",
  };
}

function toPayload(values: ClientFormValues) {
  return toClientUpdatePayload(values);
}

export function ClientEditPageClient({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [client, setClient] = useState<ClientResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canFetch = isAuthenticated;
  const paymentsSummary = useClientPaymentsSummary(clientId);

  useEffect(() => {
    if (!canFetch) {
      return;
    }

    let cancelled = false;

    clientsApi
      .getClient(clientId)
      .then((data) => {
        if (!cancelled) {
          if (isTestOrDemoClient(data)) {
            void clientsApi.deleteClient(data.id).finally(() => {
              if (!cancelled) {
                router.replace("/clients");
              }
            });
            return;
          }

          setClient(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : "Failed to load client";
          setError(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, clientId, router]);

  async function handleSubmit(values: ClientFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await clientsApi.updateClient(clientId, toPayload(values));
      propagateClientDetailsToLocalRecords(updated);
      upsertClientInSnapshot(updated);
      notifyClientsUpdated();
      setClient(updated);
      toast.success("Client updated");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update client";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!client) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteClientWithLinkedData(client);
      toast.success(`${client.name} deleted`);
      setDeleteOpen(false);
      router.push("/clients");
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
      <div>
        <Link href="/clients" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit client</h1>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Sign in to edit clients.</p>
      ) : error && !client ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !client ? (
        <p className="text-sm text-muted-foreground">Loading client...</p>
      ) : (
        <>
          <ClientForm
            initialValues={toFormValues(client)}
            submitLabel="Save changes"
            isSubmitting={isSubmitting}
            error={error}
            onSubmit={handleSubmit}
          />

          <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-base">Payments</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href={`/payments/clients/${clientId}`}>View full history</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Paid</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatINR(paymentsSummary.totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending</p>
                  <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                    {formatINR(paymentsSummary.totalPending)}
                  </p>
                </div>
              </div>

              {paymentsSummary.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects for this client yet.</p>
              ) : (
                <div className="space-y-2">
                  {paymentsSummary.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/payments/${project.id}`}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <span>
                        {project.projectNumber} · {project.projectName}
                      </span>
                      <Badge variant={getPaymentStatus(project) === "paid" ? "success" : "secondary"}>
                        {PAYMENT_STATUS_LABELS[getPaymentStatus(project)]}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}

              {paymentsSummary.documents.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Invoices &amp; Quotations
                  </p>
                  {paymentsSummary.documents.map((document) => (
                    <Link
                      key={document.id}
                      href={`/documents/${document.id}`}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <span>{document.documentNumber}</span>
                      <Badge variant={document.type === "invoice" ? "default" : "secondary"}>
                        {document.type === "invoice" ? "Invoice" : "Quotation"}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2Icon className="size-4" />
            Delete Client
          </Button>

          <ClientDeleteDialog
            open={deleteOpen}
            client={client}
            hasLinkedRecords={clientHasLinkedRecords(client.id, client)}
            isDeleting={isDeleting}
            onOpenChange={(open) => {
              if (!isDeleting) {
                setDeleteOpen(open);
              }
            }}
            onConfirm={handleConfirmDelete}
          />
        </>
      )}
    </div>
  );
}
