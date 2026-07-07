"use client";

import { Badge, Button, Input, Label, Textarea, cn, Checkbox } from "@st-manager/ui";
import { SearchIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

import { WizardStepHeader } from "@/components/inquiry/wizard/WizardStepHeader";
import { WhatsAppNotifyIcon } from "@/components/whatsapp/WhatsAppNotifyIcon";
import { useClients } from "@/hooks/useClients";
import { getClientWhatsAppNumber } from "@/lib/clients/whatsapp";
import { filterClientsBySearch } from "@/lib/inquiry/client-search";
import type { InquiryWizardSchema } from "@/lib/inquiry/schema";

type ClientMode = "existing" | "new";

export function ClientDetailsStep() {
  const clients = useClients();
  const {
    register,
    setValue,
    watch,
    getValues,
    clearErrors,
    formState: { errors },
  } = useFormContext<InquiryWizardSchema>();

  const [mode, setMode] = useState<ClientMode>(() =>
    getValues("existingClientId") ? "existing" : "new",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const existingClientId = watch("existingClientId");
  const mobileNumber = watch("mobileNumber");
  const whatsappNumber = watch("whatsappNumber");
  const clientName = watch("clientName");
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false);

  const filteredClients = useMemo(
    () => filterClientsBySearch(clients, searchQuery, 8),
    [clients, searchQuery],
  );

  useEffect(() => {
    if (clients.length === 0 || !existingClientId) {
      return;
    }

    if (clients.some((client) => client.id === existingClientId)) {
      return;
    }

    setValue("existingClientId", "", { shouldDirty: true });
  }, [clients, existingClientId, setValue]);

  function switchMode(nextMode: ClientMode) {
    setMode(nextMode);
    if (nextMode === "new") {
      setValue("existingClientId", "", { shouldDirty: true });
      setSearchQuery("");
    }
  }

  function selectExistingClient(client: (typeof clients)[number]) {
    setValue("existingClientId", client.id, { shouldDirty: true, shouldValidate: true });
    setValue("clientName", client.name, { shouldDirty: true, shouldValidate: true });
    setValue("mobileNumber", client.phone ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("whatsappNumber", getClientWhatsAppNumber(client) ?? "", { shouldDirty: true });
    setValue("email", client.email ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("notes", client.notes ?? "", { shouldDirty: true });
    setWhatsappSameAsPhone(client.whatsappSameAsPhone ?? false);
    setSearchQuery(client.name);
    clearErrors(["clientName", "mobileNumber", "email"]);
  }

  const showEmptyClientList = clients.length === 0;
  const showNoSearchResults = !showEmptyClientList && filteredClients.length === 0;

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

          {showEmptyClientList ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">No clients available.</p>
              <p className="text-sm text-muted-foreground">
                Create a client first or choose &quot;Create New Client&quot;.
              </p>
            </div>
          ) : showNoSearchResults ? (
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
          <Label htmlFor="mobileNumber">Phone Number *</Label>
          <Input
            id="mobileNumber"
            placeholder="+91 9876543210"
            readOnly={mode === "existing" && Boolean(existingClientId)}
            {...register("mobileNumber", {
              onChange: (event) => {
                if (whatsappSameAsPhone) {
                  setValue("whatsappNumber", event.target.value, { shouldDirty: true });
                }
              },
            })}
          />
          {errors.mobileNumber ? (
            <p className="text-sm text-destructive">{errors.mobileNumber.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <WhatsAppNotifyIcon
              whatsappNumber={whatsappSameAsPhone ? mobileNumber : whatsappNumber}
              type="inquiry_received"
              variables={{ ClientName: clientName || "Client" }}
              size="sm"
            />
          </div>
          <Input
            id="whatsappNumber"
            placeholder="+91 9123456789"
            disabled={whatsappSameAsPhone}
            {...register("whatsappNumber")}
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="whatsapp-same-as-phone"
              checked={whatsappSameAsPhone}
              onCheckedChange={(checked) => {
                const enabled = checked === true;
                setWhatsappSameAsPhone(enabled);
                if (enabled) {
                  setValue("whatsappNumber", mobileNumber, { shouldDirty: true });
                }
              }}
            />
            <Label htmlFor="whatsapp-same-as-phone" className="text-sm font-normal">
              Same as Phone Number
            </Label>
          </div>
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
