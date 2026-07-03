import { ApiError } from "@st-manager/api-sdk";
import type { ClientResponseDto } from "@st-manager/contracts";
import { layout } from "@st-manager/theme";
import { Button } from "@st-manager/ui";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { ClientForm, type ClientFormValues } from "../../components/clients/ClientForm";
import { useAuth } from "../../hooks/useAuth";
import { clientsApi } from "../../lib/api-client";

function toFormValues(client: ClientResponseDto): ClientFormValues {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    company: client.company ?? "",
    notes: client.notes ?? "",
  };
}

function toPayload(values: ClientFormValues) {
  return {
    name: values.name,
    email: values.email || null,
    phone: values.phone || null,
    company: values.company || null,
    notes: values.notes || null,
  };
}

export function ClientEditPage() {
  const navigate = useNavigate();
  const { id: clientId = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const [client, setClient] = useState<ClientResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canFetch = isAuthenticated && clientId.length > 0;

  useEffect(() => {
    if (!canFetch) {
      return;
    }

    let cancelled = false;

    clientsApi
      .getClient(clientId)
      .then((data) => {
        if (!cancelled) {
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
  }, [canFetch, clientId]);

  async function handleSubmit(values: ClientFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await clientsApi.updateClient(clientId, toPayload(values));
      setClient(updated);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update client";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive() {
    setIsDeleting(true);
    setError(null);

    try {
      await clientsApi.deleteClient(clientId);
      navigate("/clients");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to archive client";
      setError(message);
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
        <Link to="/clients" className="text-sm text-primary underline-offset-4 hover:underline">
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
          <Button variant="destructive" disabled={isDeleting} onClick={() => void handleArchive()}>
            {isDeleting ? "Archiving..." : "Archive client"}
          </Button>
        </>
      )}
    </div>
  );
}
