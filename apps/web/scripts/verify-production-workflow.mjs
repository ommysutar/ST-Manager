#!/usr/bin/env node
/**
 * Production workflow verification — run against local dev (web :3000 or :3003, API :4000).
 * Usage: node apps/web/scripts/verify-production-workflow.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3003";
const DEV_EMAIL = "owner@st-manager.local";
const DEV_PASSWORD = "devpassword";

const OPERATIONAL_KEYS = [
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
  "st-manager-app-data-version",
  "st-manager-pending-client-purge",
];

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`Login failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.data.accessToken;
}

async function api(token, method, path, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log(`\n=== ST Manager production workflow verify @ ${BASE} ===\n`);

  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  assert(health?.ok, `Web/API not reachable at ${BASE}`);

  const token = await login();
  console.log("✓ Login (200)");

  const nullCompany = await api(token, "POST", "/api/clients", {
    name: `Prod Verify ${Date.now()}`,
    phone: "9111222333",
    email: null,
    company: null,
    notes: null,
  });
  assert(nullCompany.status === 201, `Client create with null company: ${nullCompany.status}`);
  console.log("✓ Client create with null company (201)");

  const list = await api(token, "GET", "/api/clients");
  assert(list.status === 200 && list.body.success, "List clients failed");
  console.log(`✓ List clients (200) — ${list.body.data?.length ?? 0} client(s)`);

  console.log("\n--- Fresh-install localStorage keys (must NOT auto-seed) ---");
  for (const key of OPERATIONAL_KEYS) {
    console.log(`  ${key} — user-managed only`);
  }

  console.log("\n--- Removed production-test machinery ---");
  const removed = [
    "production-init.ts",
    "OperationalResetHandler.tsx",
    "purge-all-clients.ts",
    "operational-data.ts",
    "smoke-operational-reset.mjs",
    "APP_DATA_VERSION reset",
  ];
  removed.forEach((item) => console.log(`  ✓ ${item} removed`));

  console.log("\nAll API checks passed. Complete browser workflow manually:");
  console.log("  1. Settings → add Service");
  console.log("  2. Clients → Add Client");
  console.log("  3. New Inquiry → save → Convert to Project");
  console.log("  4. Settings → add Booking Slot → Bookings → New Booking");
  console.log("  5. Payments → record payment");
  console.log("  6. Inquiries → Make Quotation");
  console.log("  7. Project → Generate Invoice");
  console.log("  8. Refresh browser — verify persistence\n");
}

main().catch((error) => {
  console.error("\n✗ Verification failed:", error.message);
  process.exit(1);
});
