"use client";

import { ApiError } from "@st-manager/api-sdk";
import type { ClientResponseDto, InvoiceResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Button } from "@st-manager/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { InvoiceForm, InvoiceTotalsPreview, type InvoiceFormValues } from "@/components/billing/InvoiceForm";
import { useAuth } from "@/hooks/useAuth";
import { clientsApi, invoicesApi } from "@/lib/api-client";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatStatus(status: InvoiceResponseDto["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function InvoiceDetailPageClient({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceResponseDto | null>(null);
  const [clients, setClients] = useState<ClientResponseDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    Promise.all([
      invoicesApi.getInvoice(invoiceId),
      clientsApi.listClients({ page: 1, pageSize: 100 }),
    ])
      .then(([invoiceResponse, clientResponse]) => {
        setInvoice(invoiceResponse);
        setClients(clientResponse.data);
      })
      .catch((err: unknown) => {
        const message = err instanceof ApiError ? err.message : "Failed to load invoice";
        setError(message);
      });
  }, [invoiceId, isAuthenticated]);

  async function refreshInvoice() {
    const response = await invoicesApi.getInvoice(invoiceId);
    setInvoice(response);
  }

  async function handleUpdate(values: InvoiceFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      await invoicesApi.updateInvoice(invoiceId, {
        clientId: values.clientId,
        lineItems: values.lineItems,
        taxRate: Number(values.taxRate),
        dueDate: values.dueDate,
        notes: values.notes || null,
      });
      await refreshInvoice();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update invoice";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSend() {
    setIsSubmitting(true);
    setError(null);

    try {
      await invoicesApi.sendInvoice(invoiceId);
      await refreshInvoice();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to send invoice";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMarkPaid() {
    setIsSubmitting(true);
    setError(null);

    try {
      await invoicesApi.markInvoicePaid(invoiceId);
      await refreshInvoice();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to mark invoice paid";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVoid() {
    setIsSubmitting(true);
    setError(null);

    try {
      await invoicesApi.voidInvoice(invoiceId);
      router.push("/billing");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to void invoice";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="mx-auto flex flex-col gap-6 print:max-w-none"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="print:hidden">
        <Link href="/billing" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to billing
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Invoice detail</h1>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Sign in to view invoices.</p>
      ) : !invoice ? (
        <p className="text-sm text-muted-foreground">{error ?? "Loading invoice..."}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div id="invoice-print-area" className="rounded-md border border-border p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">Invoice #{invoice.number}</p>
                <p className="text-sm text-muted-foreground">{invoice.clientName}</p>
              </div>
              <div className="text-right text-sm">
                <p>Status: {formatStatus(invoice.status)}</p>
                <p>Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                {invoice.issuedAt ? (
                  <p>Issued: {new Date(invoice.issuedAt).toLocaleDateString()}</p>
                ) : null}
                {invoice.paidAt ? (
                  <p>Paid: {new Date(invoice.paidAt).toLocaleDateString()}</p>
                ) : null}
              </div>
            </div>

            <table className="mb-6 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2">Description</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Unit</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-border">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <InvoiceTotalsPreview lineItems={invoice.lineItems} taxRate={invoice.taxRate} />

            {invoice.notes ? (
              <p className="mt-4 text-sm text-muted-foreground">Notes: {invoice.notes}</p>
            ) : null}

            {invoice.sessionId ? (
              <p className="mt-4 text-sm print:hidden">
                <Link
                  href={`/sessions/${invoice.sessionId}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  View linked session
                </Link>
              </p>
            ) : null}
          </div>

          {invoice.status === "draft" ? (
            <div className="print:hidden">
              <InvoiceForm
                clients={clients}
                initialValues={{
                  clientId: invoice.clientId,
                  taxRate: String(invoice.taxRate),
                  dueDate: invoice.dueDate.slice(0, 16),
                  notes: invoice.notes ?? "",
                  lineItems: invoice.lineItems,
                }}
                submitLabel="Save draft"
                isSubmitting={isSubmitting}
                error={error}
                onSubmit={handleUpdate}
              />
            </div>
          ) : null}

          {error && invoice.status !== "draft" ? (
            <p className="text-sm text-destructive print:hidden">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-3 print:hidden">
            {invoice.status === "draft" ? (
              <Button disabled={isSubmitting} onClick={() => void handleSend()}>
                Send invoice
              </Button>
            ) : null}
            {invoice.status === "sent" ? (
              <Button disabled={isSubmitting} onClick={() => void handleMarkPaid()}>
                Mark paid
              </Button>
            ) : null}
            {invoice.status === "draft" || invoice.status === "sent" ? (
              <Button variant="outline" disabled={isSubmitting} onClick={() => void handleVoid()}>
                Void invoice
              </Button>
            ) : null}
            <Button variant="outline" onClick={handlePrint}>
              Print / PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
