"use client";

import type { ClientResponseDto } from "@st-manager/contracts";
import type { StudioResponseDto } from "@st-manager/contracts";
import { Button, Input } from "@st-manager/ui";
import { useState } from "react";

import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/calendar-utils";

export interface SessionFormValues {
  studioId: string;
  clientId: string;
  title: string;
  startedAt: string;
  notes: string;
}

export interface SessionFormProps {
  studios: StudioResponseDto[];
  clients: ClientResponseDto[];
  initialValues?: Partial<SessionFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string | null;
  studioReadOnly?: boolean;
  onSubmit: (values: SessionFormValues) => Promise<void>;
}

const emptyValues: SessionFormValues = {
  studioId: "",
  clientId: "",
  title: "",
  startedAt: "",
  notes: "",
};

export function SessionForm({
  studios,
  clients,
  initialValues,
  submitLabel,
  isSubmitting = false,
  error,
  studioReadOnly = false,
  onSubmit,
}: SessionFormProps) {
  const [values, setValues] = useState<SessionFormValues>({
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
        <label htmlFor="session-title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="session-title"
          value={values.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="session-studio" className="text-sm font-medium">
          Studio
        </label>
        <select
          id="session-studio"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={values.studioId}
          disabled={studioReadOnly}
          onChange={(event) =>
            setValues((current) => ({ ...current, studioId: event.target.value }))
          }
          required
        >
          <option value="">Select a studio</option>
          {studios.map((studio) => (
            <option key={studio.id} value={studio.id}>
              {studio.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="session-client" className="text-sm font-medium">
          Client
        </label>
        <select
          id="session-client"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={values.clientId}
          disabled={studioReadOnly}
          onChange={(event) =>
            setValues((current) => ({ ...current, clientId: event.target.value }))
          }
        >
          <option value="">No client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="session-start" className="text-sm font-medium">
          Planned start
        </label>
        <Input
          id="session-start"
          type="datetime-local"
          value={values.startedAt ? toDateTimeLocalValue(values.startedAt) : ""}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              startedAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : "",
            }))
          }
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="session-notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="session-notes"
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
