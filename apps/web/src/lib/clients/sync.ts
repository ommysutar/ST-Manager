import type { ClientResponseDto } from "@st-manager/contracts";

import { clientsApi } from "@/lib/api-client";
import { notifyBookingsUpdated } from "@/lib/bookings/events";
import { loadAllBookings } from "@/lib/bookings/storage";
import { setBookingsSnapshot } from "@/lib/bookings/snapshots";
import { BOOKINGS_STORAGE_KEY } from "@/lib/bookings/types";
import type { InquiryWizardFormValues } from "@/lib/inquiry/schema";
import { findDuplicateClient, normalizePhone } from "@/lib/inquiry/client-validation";
import { listInquiries, updateInquiryRecord } from "@/lib/inquiry/storage";
import { loadAllProjects, updateProject } from "@/lib/projects/storage";

import { notifyClientsUpdated } from "./events";
import { toClientCreatePayload } from "./normalize-client-payload";
import {
  createClientOfflineAware,
  getClientsSnapshot,
  refreshClientsSnapshot,
  upsertClientInSnapshot,
} from "./store";
import type { ClientSyncInput } from "./types";

export type { ClientSyncInput } from "./types";

/** Master client resolver — reuses by ID, phone, or email; otherwise creates (offline-aware). */
export async function resolveOrCreateClient(input: ClientSyncInput): Promise<ClientResponseDto> {
  await refreshClientsSnapshot().catch(() => undefined);
  const clients = getClientsSnapshot();
  const payload = toClientCreatePayload(input);

  const existingId = input.existingClientId?.trim();
  if (existingId) {
    const cached = clients.find((client) => client.id === existingId);
    if (cached) {
      return cached;
    }

    try {
      const client = await clientsApi.getClient(existingId);
      upsertClientInSnapshot(client);
      notifyClientsUpdated();
      return client;
    } catch {
      // Fall through — stale ID, resolve by duplicate rules or create fresh.
    }
  }

  const duplicate = findDuplicateClient(clients, {
    mobileNumber: payload.phone ?? "",
    email: payload.email ?? "",
    excludeClientId: existingId,
  });
  if (duplicate) {
    return duplicate;
  }

  return createClientOfflineAware({
    name: payload.name,
    phone: payload.phone ?? "",
    whatsappNumber: payload.whatsappNumber ?? "",
    whatsappSameAsPhone: payload.whatsappSameAsPhone ?? false,
    email: payload.email ?? "",
    company: payload.company ?? "",
    notes: payload.notes ?? "",
  });
}

/** Applies resolved client fields back onto an inquiry wizard form. */
export function applyClientToInquiryForm(
  form: InquiryWizardFormValues,
  client: ClientResponseDto,
): InquiryWizardFormValues {
  const whatsapp =
    client.whatsappSameAsPhone
      ? (client.phone ?? "")
      : (client.whatsappNumber ?? form.whatsappNumber);

  return {
    ...form,
    existingClientId: client.id,
    clientName: client.name,
    mobileNumber: client.phone ?? form.mobileNumber,
    whatsappNumber: whatsapp,
    email: client.email ?? form.email,
    notes: client.notes ?? form.notes,
  };
}

/** Ensures inquiry/project wizards persist a real API client before saving local records. */
export async function ensureInquiryClientSynced(form: InquiryWizardFormValues): Promise<{
  client: ClientResponseDto;
  form: InquiryWizardFormValues;
}> {
  const client = await resolveOrCreateClient({
    existingClientId: form.existingClientId,
    name: form.clientName,
    phone: form.mobileNumber,
    whatsappNumber: form.whatsappNumber,
    whatsappSameAsPhone:
      Boolean(form.mobileNumber.trim()) &&
      normalizePhone(form.whatsappNumber) === normalizePhone(form.mobileNumber),
    email: form.email,
    notes: form.notes,
  });

  return {
    client,
    form: applyClientToInquiryForm(form, client),
  };
}

/** Keeps denormalized client fields in sync after editing from the Clients module. */
export function propagateClientDetailsToLocalRecords(client: ClientResponseDto): void {
  for (const project of loadAllProjects()) {
    if (project.clientId !== client.id) {
      continue;
    }

    updateProject(project.id, {
      clientName: client.name,
      clientMobile: client.phone ?? undefined,
      clientEmail: client.email ?? undefined,
    });
  }

  for (const inquiry of listInquiries()) {
    if (inquiry.form.existingClientId !== client.id) {
      continue;
    }

    updateInquiryRecord(inquiry.id, {
      form: applyClientToInquiryForm(inquiry.form, client),
    });
  }

  const projectIds = new Set(
    loadAllProjects()
      .filter((project) => project.clientId === client.id)
      .map((project) => project.id),
  );

  if (projectIds.size === 0) {
    return;
  }

  const bookings = loadAllBookings();
  let bookingsChanged = false;
  const nextBookings = bookings.map((booking) => {
    if (!projectIds.has(booking.projectId) || booking.clientName === client.name) {
      return booking;
    }

    bookingsChanged = true;
    return {
      ...booking,
      clientName: client.name,
      updatedAt: new Date().toISOString(),
    };
  });

  if (!bookingsChanged || typeof window === "undefined") {
    return;
  }

  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(nextBookings));
  setBookingsSnapshot(nextBookings);
  notifyBookingsUpdated();
}
