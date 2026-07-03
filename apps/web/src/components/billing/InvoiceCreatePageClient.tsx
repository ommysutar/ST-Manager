"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { ClientResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { InvoiceForm, type InvoiceFormValues } from "@/components/billing/InvoiceForm";
import { useAuth } from "@/hooks/useAuth";
import { clientsApi, invoicesApi, sessionsApi } from "@/lib/api-client";

function InvoiceCreatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { isAuthenticated } = useAuth();
  const [clients, setClients] = useState<ClientResponseDto[]>([]);
  const [initialValues, setInitialValues] = useState<Partial<InvoiceFormValues>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(!sessionId);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    Promise.all([
      clientsApi.listClients({ page: 1, pageSize: 100 }),
      sessionId ? sessionsApi.getSession(sessionId) : Promise.resolve(null),
    ])
      .then(([clientResponse, session]) => {
        setClients(clientResponse.data);

        if (session) {
          setInitialValues({
            clientId: session.clientId ?? "",
            lineItems: [
              {
                description: session.title,
                quantity: 1,
                unitPrice: 0,
                amount: 0,
              },
            ],
            notes: session.notes ?? "",
          });
        }

        setIsReady(true);
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "Failed to load form data";
        setError(message);
        setIsReady(true);
      });
  }, [isAuthenticated, sessionId]);

  async function handleSubmit(values: InvoiceFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const invoice = await invoicesApi.createInvoice({
        clientId: values.clientId,
        sessionId: sessionId ?? null,
        lineItems: values.lineItems,
        taxRate: Number(values.taxRate),
        dueDate: values.dueDate,
        notes: values.notes || null,
      });
      router.push(`/billing/${invoice.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create invoice";
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
        <Link href="/billing" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to billing
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {sessionId ? "Create invoice from session" : "New invoice"}
        </h1>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Sign in to create invoices.</p>
      ) : !isReady ? (
        <p className="text-sm text-muted-foreground">Loading form...</p>
      ) : (
        <InvoiceForm
          clients={clients}
          initialValues={initialValues}
          submitLabel="Create invoice"
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

export function InvoiceCreatePageClient() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading form...</p>}>
      <InvoiceCreatePageInner />
    </Suspense>
  );
}
