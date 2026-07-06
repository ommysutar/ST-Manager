import type { ClientResponseDto } from "@st-manager/contracts";

import { clientsApi } from "@/lib/api-client";
import { listBookings } from "@/lib/bookings/storage";
import { getBookingSlotLabel } from "@/lib/bookings/slots";
import { filterClientsBySearch } from "@/lib/inquiry/client-search";
import { listInquiries } from "@/lib/inquiry/storage";
import { filterActiveProjects } from "@/lib/projects/filters";
import { listProjects } from "@/lib/projects/storage";
import type { SearchResult } from "./types";

export async function fetchAllClients(): Promise<ClientResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: ClientResponseDto[] = [];

  while (page <= 20) {
    const response = await clientsApi.listClients({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  return all;
}

export function searchLocalEntities(query: string): SearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const project of listProjects()) {
    const haystack = [project.projectNumber, project.projectName, project.clientName]
      .join(" ")
      .toLowerCase();
    if (haystack.includes(normalized)) {
      results.push({
        id: project.id,
        type: "project",
        title: `${project.projectNumber} · ${project.projectName}`,
        subtitle: project.clientName,
        href: `/projects/${project.id}`,
      });
    }
  }

  for (const inquiry of listInquiries()) {
    const haystack = [
      inquiry.inquiryNumber,
      inquiry.form.projectName,
      inquiry.form.clientName,
    ]
      .join(" ")
      .toLowerCase();
    if (haystack.includes(normalized)) {
      results.push({
        id: inquiry.id,
        type: "inquiry",
        title: `${inquiry.inquiryNumber} · ${inquiry.form.projectName}`,
        subtitle: inquiry.form.clientName,
        href: `/inquiries/new?inquiryId=${inquiry.id}`,
      });
    }
  }

  for (const booking of listBookings()) {
    if (booking.status !== "confirmed") {
      continue;
    }
    const haystack = [booking.projectName, booking.clientName, booking.bookingFor]
      .join(" ")
      .toLowerCase();
    if (haystack.includes(normalized)) {
      results.push({
        id: booking.id,
        type: "booking",
        title: booking.bookingFor,
        subtitle: `${booking.projectName} · ${getBookingSlotLabel(booking.slotId)}`,
        href: `/bookings/${booking.id}`,
      });
    }
  }

  for (const project of listProjects()) {
    if (project.remainingBalance <= 0 || project.grandTotal <= 0) {
      continue;
    }
    const haystack = [project.projectNumber, project.projectName, project.clientName, "payment"]
      .join(" ")
      .toLowerCase();
    if (haystack.includes(normalized)) {
      results.push({
        id: `pay-${project.id}`,
        type: "payment",
        title: `${project.projectName} — Pending ₹${project.remainingBalance.toLocaleString("en-IN")}`,
        subtitle: `${project.clientName} · Payment pending`,
        href: `/payments/${project.id}`,
      });
    }
  }

  return results;
}

export function searchClients(clients: ClientResponseDto[], query: string): SearchResult[] {
  return filterClientsBySearch(clients, query, 8).map((client) => ({
    id: client.id,
    type: "client",
    title: client.name,
    subtitle: [client.phone, client.email].filter(Boolean).join(" · ") || "Client",
    href: `/clients/${client.id}`,
  }));
}

export function mergeSearchResults(
  clients: SearchResult[],
  local: SearchResult[],
): SearchResult[] {
  const order: SearchResult["type"][] = ["client", "project", "inquiry", "booking", "payment"];
  const grouped = new Map<SearchResult["type"], SearchResult[]>();

  for (const result of [...clients, ...local]) {
    const bucket = grouped.get(result.type) ?? [];
    if (!bucket.some((entry) => entry.id === result.id)) {
      bucket.push(result);
    }
    grouped.set(result.type, bucket);
  }

  return order.flatMap((type) => grouped.get(type) ?? []).slice(0, 20);
}

export { filterActiveProjects };
