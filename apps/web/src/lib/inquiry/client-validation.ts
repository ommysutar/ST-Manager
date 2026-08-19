import type { ClientResponseDto } from "@st-manager/contracts";

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function findDuplicateClient(
  clients: ClientResponseDto[],
  input: {
    mobileNumber: string;
    email: string;
    name?: string;
    excludeClientId?: string;
  },
): ClientResponseDto | null {
  const mobile = normalizePhone(input.mobileNumber);
  const email = normalizeEmail(input.email);
  const name = input.name?.trim().toLowerCase() ?? "";

  for (const client of clients) {
    if (input.excludeClientId && client.id === input.excludeClientId) {
      continue;
    }

    if (mobile.length >= 10 && client.phone && normalizePhone(client.phone) === mobile) {
      return client;
    }

    if (email && client.email && normalizeEmail(client.email) === email) {
      return client;
    }
  }

  // When contact fields are empty (e.g. manual project create with name only),
  // reuse an exact name match so we do not mint a second server client.
  if (!mobile && !email && name) {
    for (const client of clients) {
      if (input.excludeClientId && client.id === input.excludeClientId) {
        continue;
      }
      if (client.name.trim().toLowerCase() === name) {
        return client;
      }
    }
  }

  return null;
}
