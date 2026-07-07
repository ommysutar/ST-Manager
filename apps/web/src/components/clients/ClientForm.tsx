"use client";

import { Button, Checkbox, Input, Label } from "@st-manager/ui";
import { useState } from "react";

import { WhatsAppNotifyIcon } from "@/components/whatsapp/WhatsAppNotifyIcon";

export interface ClientFormValues {
  name: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  whatsappSameAsPhone: boolean;
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
  whatsappNumber: "",
  whatsappSameAsPhone: false,
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

  function updatePhone(phone: string) {
    setValues((current) => ({
      ...current,
      phone,
      whatsappNumber: current.whatsappSameAsPhone ? phone : current.whatsappNumber,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(values);
  }

  const effectiveWhatsApp = values.whatsappSameAsPhone ? values.phone : values.whatsappNumber;

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
          Phone Number
        </label>
        <Input
          id="client-phone"
          placeholder="+91 9876543210"
          value={values.phone}
          onChange={(event) => updatePhone(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="client-whatsapp" className="text-sm font-medium">
            WhatsApp Number
          </label>
          <WhatsAppNotifyIcon
            whatsappNumber={effectiveWhatsApp}
            type="inquiry_received"
            variables={{ ClientName: values.name || "Client" }}
            size="sm"
          />
        </div>
        <Input
          id="client-whatsapp"
          placeholder="+91 9123456789"
          value={values.whatsappSameAsPhone ? values.phone : values.whatsappNumber}
          disabled={values.whatsappSameAsPhone}
          onChange={(event) =>
            setValues((current) => ({ ...current, whatsappNumber: event.target.value }))
          }
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="client-whatsapp-same"
            checked={values.whatsappSameAsPhone}
            onCheckedChange={(checked) =>
              setValues((current) => ({
                ...current,
                whatsappSameAsPhone: checked === true,
                whatsappNumber: checked === true ? current.phone : current.whatsappNumber,
              }))
            }
          />
          <Label htmlFor="client-whatsapp-same" className="text-sm font-normal">
            Same as Phone Number
          </Label>
        </div>
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
