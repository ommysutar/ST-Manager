#!/usr/bin/env node
/**
 * Purges test/demo clients from the API and prints localStorage keys to clear for a fresh install.
 * Usage: node apps/web/scripts/purge-test-data.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3004";
const DEV_EMAIL = "owner@st-manager.local";
const DEV_PASSWORD = "devpassword";

const TEST_NAME_PATTERNS = [
  /smoke client/i,
  /smoke test client/i,
  /demo client/i,
  /test client/i,
  /reports smoke client/i,
  /invoices smoke client/i,
  /^M\d+\s+.*smoke/i,
  /e2e/i,
  /verify client/i,
  /prod verify/i,
  /runtime test/i,
  /null company test/i,
  /fake client/i,
];

function isTestClient(client) {
  const name = (client.name ?? "").trim();
  return TEST_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`Login failed: ${res.status}`);
  }
  return body.data.accessToken;
}

async function listAllClients(token) {
  const all = [];
  let page = 1;
  while (page <= 20) {
    const res = await fetch(`${BASE}/api/clients?page=${page}&pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!body.success) {
      throw new Error("List clients failed");
    }
    all.push(...body.data);
    if (body.data.length < 100) {
      break;
    }
    page += 1;
  }
  return all;
}

async function deleteClient(token, id) {
  const res = await fetch(`${BASE}/api/clients/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

async function main() {
  console.log(`\nPurging test/demo clients @ ${BASE}\n`);
  const token = await login();
  const clients = await listAllClients(token);
  const testClients = clients.filter(isTestClient);

  for (const client of testClients) {
    const ok = await deleteClient(token, client.id);
    console.log(`${ok ? "✓" : "✗"} Deleted: ${client.name}`);
  }

  const remaining = (await listAllClients(token)).filter(isTestClient);
  console.log(`\nRemoved ${testClients.length} test client(s). Remaining test clients: ${remaining.length}`);
  console.log("\nClear browser localStorage keys for a fresh install:");
  [
    "st-manager-inquiries",
    "st-manager-projects",
    "st-manager-bookings",
    "st-manager-payments",
    "st-manager-documents",
    "st-manager-service-pricing",
    "st-manager-studios",
    "st-manager-booking-slots",
    "st-manager-wizard-draft",
    "st-manager-client-numbers",
  ].forEach((key) => console.log(`  localStorage.removeItem('${key}')`));
  console.log("");
}

main().catch((error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});
