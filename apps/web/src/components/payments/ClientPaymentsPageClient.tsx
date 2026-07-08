"use client";

import type { ClientResponseDto } from "@st-manager/contracts";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useClientPaymentsSummary } from "@/hooks/useClientPaymentsSummary";
import { formatINR } from "@/lib/currency";
import { getClientWhatsAppNumber } from "@/lib/clients/whatsapp";
import { PAYMENT_STATUS_LABELS, getPaymentStatus } from "@/lib/payments/status";
import { fetchAllClients } from "@/lib/search/global-search";

import { WhatsAppNotifyIcon } from "@/components/whatsapp/WhatsAppNotifyIcon";

export function ClientPaymentsPageClient({ clientId }: { clientId: string }) {
  const { isAuthenticated } = useAuth();
  const { projects: clientProjects, documents: clientDocuments, totalPaid, totalPending } =
    useClientPaymentsSummary(clientId);
  const [client, setClient] = useState<ClientResponseDto | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    fetchAllClients()
      .then((all) => setClient(all.find((entry) => entry.id === clientId) ?? null))
      .catch(() => setClient(null));
  }, [isAuthenticated, clientId]);

  const displayName = client?.name ?? clientProjects[0]?.clientName ?? "Client";
  const displayMobile = client?.phone ?? clientProjects[0]?.clientMobile ?? "";
  const displayEmail = client?.email ?? clientProjects[0]?.clientEmail ?? "";

  if (!isAuthenticated) {
    return <p className="text-sm text-muted-foreground">Sign in to view payments.</p>;
  }

  return (
    <div className="page-container flex flex-col gap-6">
      <div>
        <Link href="/payments" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to payments
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="page-title">{displayName}</h1>
          {client ? (
            <WhatsAppNotifyIcon
              whatsappNumber={getClientWhatsAppNumber(client)}
              type="payment_reminder"
              variables={{ ClientName: displayName, BalanceAmount: formatINR(totalPending) }}
              size="sm"
            />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {[displayMobile, displayEmail].filter(Boolean).join(" · ") || "No contact info"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatINR(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
              {formatINR(totalPending)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Projects</h2>
        {clientProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects for this client yet.</p>
        ) : (
          <div className="grid gap-3">
            {clientProjects.map((project) => {
              const status = getPaymentStatus(project);
              return (
                <Link key={project.id} href={`/payments/${project.id}`}>
                  <Card className="border-border/60 bg-background/60 backdrop-blur-md transition-colors hover:border-primary/40 dark:bg-background/30">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                      <div>
                        <CardTitle className="text-base">{project.projectName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{project.projectNumber}</p>
                      </div>
                      <Badge variant={status === "paid" ? "success" : "secondary"}>
                        {PAYMENT_STATUS_LABELS[status]}
                      </Badge>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Invoices &amp; Quotations
        </h2>
        {clientDocuments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents generated yet.</p>
        ) : (
          <div className="grid gap-2">
            {clientDocuments.map((document) => (
              <Link
                key={document.id}
                href={`/documents/${document.id}`}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <span className="font-medium">{document.documentNumber}</span>
                <Badge variant={document.type === "invoice" ? "default" : "secondary"}>
                  {document.type === "invoice" ? "Invoice" : "Quotation"}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
