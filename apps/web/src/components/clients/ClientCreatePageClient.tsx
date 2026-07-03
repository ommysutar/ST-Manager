"use client";

import { ApiError } from "@st-manager/api-sdk";
import { layout } from "@st-manager/theme";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ClientForm, type ClientFormValues } from "@/components/clients/ClientForm";
import { useAuth } from "@/hooks/useAuth";
import { clientsApi } from "@/lib/api-client";

function toPayload(values: ClientFormValues) {
  return {
    name: values.name,
    email: values.email || null,
    phone: values.phone || null,
    company: values.company || null,
    notes: values.notes || null,
  };
}

export function ClientCreatePageClient() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: ClientFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const created = await clientsApi.createClient(toPayload(values));
      router.push(`/clients/${created.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create client";
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
        <Link href="/clients" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Add client</h1>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Sign in to create clients.</p>
      ) : (
        <ClientForm
          submitLabel="Create client"
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
