"use client";

import { Button, Input } from "@st-manager/ui";
import { useState } from "react";

export interface ClientFormValues {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

export interface ClientFormProps {
  initialValues?: Partial<ClientFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: (values: ClientFormValues) => Promise<void>;
}

const emptyValues: ClientFormValues = {
  name: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
};

export function ClientForm({
  initialValues,
  submitLabel,
  isSubmitting = false,
  error,
  onSubmit,
}: ClientFormProps) {
  const [values, setValues] = useState<ClientFormValues>({
    ...emptyValues,
    ...initialValues,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="client-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="client-name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="client-email"
          type="email"
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-phone" className="text-sm font-medium">
          Phone
        </label>
        <Input
          id="client-phone"
          value={values.phone}
          onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-company" className="text-sm font-medium">
          Company
        </label>
        <Input
          id="client-company"
          value={values.company}
          onChange={(event) => setValues((current) => ({ ...current, company: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="client-notes"
          value={values.notes}
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
