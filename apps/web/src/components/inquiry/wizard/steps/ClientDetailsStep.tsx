"use client";

import type { ClientResponseDto } from "@st-manager/contracts";
import { Badge, Button, Input, Label, Textarea, cn } from "@st-manager/ui";
import { SearchIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { useAuth } from "@/hooks/useAuth";
import { filterClientsBySearch } from "@/lib/inquiry/client-search";
import { findDuplicateClient } from "@/lib/inquiry/client-validation";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";
import { fetchAllClients } from "@/lib/search/global-search";

type ClientMode = "existing" | "new";

export function ClientDetailsStep() {
  const { isAuthenticated } = useAuth();
  const {
    register,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<InquiryWizardSchema>();

  const [mode, setMode] = useState<ClientMode>("new");
  const [clients, setClients] = useState<ClientResponseDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsLoaded, setClientsLoaded] = useState(false);

  const existingClientId = watch("existingClientId");
  const mobileNumber = watch("mobileNumber");
  const email = watch("email");

  const loadClients = useCallback(async () => {
    if (!isAuthenticated || clientsLoaded) {
      return;
    }

    setLoadingClients(true);
    try {
      const allClients = await fetchAllClients();
      setClients(allClients);
      setClientsLoaded(true);
    } catch {
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, [clientsLoaded, isAuthenticated]);

  const filteredClients = useMemo(
    () => filterClientsBySearch(clients, searchQuery, 8),
    [clients, searchQuery],
  );

  useEffect(() => {
    if (mode !== "new") {
      clearErrors("mobileNumber");
      clearErrors("email");
      return;
    }

    if (!isAuthenticated || clients.length === 0) {
      return;
    }

    const duplicate = findDuplicateClient(clients, {
      mobileNumber: mobileNumber ?? "",
      email: email ?? "",
      excludeClientId: existingClientId || undefined,
    });

    if (duplicate) {
      setError("mobileNumber", { type: "manual", message: "Client already exists." });
      if (email?.trim()) {
        setError("email", { type: "manual", message: "Client already exists." });
      }
      return;
    }

    clearErrors("mobileNumber");
    clearErrors("email");
  }, [mode, mobileNumber, email, clients, existingClientId, isAuthenticated, setError, clearErrors]);

  function switchMode(nextMode: ClientMode) {
    setMode(nextMode);
    if (nextMode === "existing") {
      void loadClients();
    }
    if (nextMode === "new") {
      setValue("existingClientId", "", { shouldDirty: true });
      setSearchQuery("");
    }
  }

  function selectExistingClient(client: ClientResponseDto) {
    setValue("existingClientId", client.id, { shouldDirty: true, shouldValidate: true });
    setValue("clientName", client.name, { shouldDirty: true, shouldValidate: true });
    setValue("mobileNumber", client.phone ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("email", client.email ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("notes", client.notes ?? "", { shouldDirty: true });
    setSearchQuery(client.name);
    clearErrors(["clientName", "mobileNumber", "email"]);
  }

  return (
    <div>
      <WizardStepHeader
        title="Client Details"
        description="Select an existing client or create a new one. Fields marked with * are required."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "existing" ? "default" : "outline"}
          onClick={() => switchMode("existing")}
        >
          <UsersIcon className="size-4" />
          Existing Client
        </Button>
        <Button
          type="button"
          variant={mode === "new" ? "default" : "outline"}
          onClick={() => switchMode("new")}
        >
          <UserPlusIcon className="size-4" />
          Create New Client
        </Button>
      </div>

      {mode === "existing" ? (
        <div className="mb-6 space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4 backdrop-blur-md">
          <Label htmlFor="client-search">Search clients</Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="client-search"
              className="pl-9"
              placeholder="Type name, phone, or email..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          {loadingClients ? (
            <p className="text-sm text-muted-foreground">Loading clients...</p>
          ) : filteredClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching clients found.</p>
          ) : (
            <ul className="space-y-2">
              {filteredClients.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => selectExistingClient(client)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5",
                      existingClientId === client.id && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <span>
                      <span className="block font-medium">{client.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[client.phone, client.email].filter(Boolean).join(" · ") || "No contact info"}
                      </span>
                    </span>
                    {existingClientId === client.id ? <Badge variant="success">Selected</Badge> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <input type="hidden" {...register("existingClientId")} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="clientName">Client Name *</Label>
          <Input
            id="clientName"
            placeholder="Enter client name"
            readOnly={mode === "existing" && Boolean(existingClientId)}
            {...register("clientName")}
          />
          {errors.clientName ? (
            <p className="text-sm text-destructive">{errors.clientName.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobileNumber">Mobile Number *</Label>
          <Input
            id="mobileNumber"
            placeholder="+91 98765 43210"
            readOnly={mode === "existing" && Boolean(existingClientId)}
            {...register("mobileNumber")}
          />
          {errors.mobileNumber ? (
            <p className="text-sm text-destructive">{errors.mobileNumber.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
          <Input id="whatsappNumber" placeholder="+91 98765 43210" {...register("whatsappNumber")} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="client@example.com"
            readOnly={mode === "existing" && Boolean(existingClientId)}
            {...register("email")}
          />
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" placeholder="Street, city, state" rows={3} {...register("address")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input id="reference" placeholder="Referral source" {...register("reference")} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" placeholder="Additional client notes" rows={3} {...register("notes")} />
        </div>
      </div>
    </div>
  );
}
