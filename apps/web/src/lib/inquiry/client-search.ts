import type { ClientResponseDto } from "@st-manager/contracts";

import { normalizeEmail, normalizePhone } from "./client-validation";

function tokenizeName(name: string): string[] {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/** Matches partial tokens across first name, last name, phone, email. */
export function matchesClientSearch(client: ClientResponseDto, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const tokens = tokenizeName(normalized);
  const nameTokens = tokenizeName(client.name);
  const phone = client.phone ? normalizePhone(client.phone) : "";
  const email = client.email ? normalizeEmail(client.email) : "";
  const queryDigits = normalizePhone(normalized);

  if (queryDigits.length >= 3 && phone.includes(queryDigits)) {
    return true;
  }

  if (normalized.includes("@") && email.includes(normalized)) {
    return true;
  }

  if (nameTokens.some((token) => token.includes(normalized) || normalized.includes(token))) {
    return true;
  }

  return tokens.every(
    (token) =>
      nameTokens.some((nameToken) => nameToken.includes(token) || token.includes(nameToken)) ||
      email.includes(token) ||
      (queryDigits.length >= 3 && phone.includes(token.replace(/\D/g, ""))),
  );
}

export function filterClientsBySearch(
  clients: ClientResponseDto[],
  query: string,
  limit = 12,
): ClientResponseDto[] {
  const normalized = query.trim();
  if (!normalized) {
    return clients.slice(0, limit);
  }

  return clients.filter((client) => matchesClientSearch(client, normalized)).slice(0, limit);
}
