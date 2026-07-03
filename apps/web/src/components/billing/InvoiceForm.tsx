"use client";

import type { ClientResponseDto } from "@st-manager/contracts";
import type { InvoiceLineItem } from "@st-manager/types";
import { Button, Input } from "@st-manager/ui";
import { useState } from "react";

export interface InvoiceFormValues {
  clientId: string;
  taxRate: string;
  dueDate: string;
  notes: string;
  lineItems: InvoiceLineItem[];
}

interface InvoiceFormProps {
  clients: ClientResponseDto[];
  initialValues?: Partial<InvoiceFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  error: string | null;
  readOnly?: boolean;
  onSubmit: (values: InvoiceFormValues) => void | Promise<void>;
}

function defaultDueDate(): string {
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 14);
  return due.toISOString().slice(0, 16);
}

export function InvoiceForm({
  clients,
  initialValues,
  submitLabel,
  isSubmitting,
  error,
  readOnly = false,
  onSubmit,
}: InvoiceFormProps) {
  const [clientId, setClientId] = useState(initialValues?.clientId ?? "");
  const [taxRate, setTaxRate] = useState(initialValues?.taxRate ?? "0");
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? defaultDueDate());
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    initialValues?.lineItems ?? [
      { description: "Studio time", quantity: 1, unitPrice: 0, amount: 0 },
    ],
  );

  function updateLineItem(index: number, patch: Partial<InvoiceLineItem>) {
    setLineItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const next = { ...item, ...patch };
        if ("quantity" in patch || "unitPrice" in patch) {
          next.amount = Math.round(next.quantity * next.unitPrice * 100) / 100;
        }

        return next;
      }),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit({
      clientId,
      taxRate,
      dueDate: new Date(dueDate).toISOString(),
      notes,
      lineItems,
    });
  }

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label htmlFor="invoice-client" className="text-sm font-medium">
          Client
        </label>
        <select
          id="invoice-client"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={clientId}
          disabled={readOnly}
          onChange={(event) => setClientId(event.target.value)}
          required
        >
          <option value="">Select a client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Line items</p>
        {lineItems.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-md border border-border p-3">
            <Input
              value={item.description}
              disabled={readOnly}
              placeholder="Description"
              onChange={(event) => updateLineItem(index, { description: event.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.quantity}
                disabled={readOnly}
                onChange={(event) =>
                  updateLineItem(index, { quantity: Number(event.target.value) })
                }
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                disabled={readOnly}
                placeholder="Unit price"
                onChange={(event) =>
                  updateLineItem(index, { unitPrice: Number(event.target.value) })
                }
              />
              <Input type="number" value={item.amount} disabled />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="invoice-tax-rate" className="text-sm font-medium">
            Tax rate (%)
          </label>
          <Input
            id="invoice-tax-rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={taxRate}
            disabled={readOnly}
            onChange={(event) => setTaxRate(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="invoice-due-date" className="text-sm font-medium">
            Due date
          </label>
          <Input
            id="invoice-due-date"
            type="datetime-local"
            value={dueDate}
            disabled={readOnly}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="invoice-notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="invoice-notes"
          value={notes}
          disabled={readOnly}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!readOnly ? (
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      ) : null}
    </form>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function InvoiceTotalsPreview({
  lineItems,
  taxRate,
}: {
  lineItems: InvoiceLineItem[];
  taxRate: number;
}) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return (
    <div className="rounded-md border border-border p-4 text-sm">
      <p>Subtotal: {formatCurrency(subtotal)}</p>
      <p>Tax: {formatCurrency(tax)}</p>
      <p className="font-medium">Total: {formatCurrency(total)}</p>
    </div>
  );
}
