import type { ClientResponseDto } from "@st-manager/contracts";

/** Identifies development, CI, and smoke-test clients that must not appear in production. */
export function isTestOrDemoClient(client: ClientResponseDto): boolean {
  const name = client.name.trim();
  const email = (client.email ?? "").trim().toLowerCase();

  const namePatterns = [
    /\bsmoke client\b/i,
    /\bsmoke test client\b/i,
    /\bdemo client\b/i,
    /\btest client\b/i,
    /\breports smoke client\b/i,
    /\binvoices smoke client\b/i,
    /^M\d+\s+.*\bsmoke\b/i,
    /\be2e\b/i,
    /\bverify client\b/i,
    /\bprod verify\b/i,
    /\bruntime test\b/i,
    /\bnull company test\b/i,
    /\bfake client\b/i,
    /\bdemo project\b/i,
  ] as const;

  if (namePatterns.some((pattern) => pattern.test(name))) {
    return true;
  }

  return email.endsWith("@example.com") || email.includes("smoke") || email.includes("test+");
}

export function filterProductionClients(clients: ClientResponseDto[]): ClientResponseDto[] {
  return clients.filter((client) => !isTestOrDemoClient(client));
}
