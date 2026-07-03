"use client";

import type { ClientResponseDto } from "@st-manager/contracts";
import type { StudioResponseDto } from "@st-manager/contracts";
import { Button, Input } from "@st-manager/ui";
import { useState } from "react";

import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/calendar-utils";

export interface BookingFormValues {
  studioId: string;
  clientId: string;
  title: string;
  startAt: string;
  endAt: string;
  notes: string;
}

export interface BookingFormProps {
  studios: StudioResponseDto[];
  clients: ClientResponseDto[];
  initialValues?: Partial<BookingFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string | null;
  studioReadOnly?: boolean;
  onSubmit: (values: BookingFormValues) => Promise<void>;
  onCancelBooking?: () => Promise<void>;
}

const emptyValues: BookingFormValues = {
  studioId: "",
  clientId: "",
  title: "",
  startAt: "",
  endAt: "",
  notes: "",
};

export function BookingForm({
  studios,
  clients,
  initialValues,
  submitLabel,
  isSubmitting = false,
  error,
  studioReadOnly = false,
  onSubmit,
  onCancelBooking,
}: BookingFormProps) {
  const [values, setValues] = useState<BookingFormValues>({
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
        <label htmlFor="booking-title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="booking-title"
          value={values.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="booking-studio" className="text-sm font-medium">
          Studio
        </label>
        <select
          id="booking-studio"
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
        <label htmlFor="booking-client" className="text-sm font-medium">
          Client
        </label>
        <select
          id="booking-client"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={values.clientId}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="booking-start" className="text-sm font-medium">
            Start
          </label>
          <Input
            id="booking-start"
            type="datetime-local"
            value={values.startAt ? toDateTimeLocalValue(values.startAt) : ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                startAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : "",
              }))
            }
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="booking-end" className="text-sm font-medium">
            End
          </label>
          <Input
            id="booking-end"
            type="datetime-local"
            value={values.endAt ? toDateTimeLocalValue(values.endAt) : ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                endAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : "",
              }))
            }
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="booking-notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="booking-notes"
          value={values.notes}
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        {onCancelBooking ? (
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onCancelBooking()}>
            Cancel booking
          </Button>
        ) : null}
      </div>
    </form>
  );
}
