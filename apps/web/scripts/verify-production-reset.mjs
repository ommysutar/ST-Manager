#!/usr/bin/env node
/**
 * Verifies production reset state — API empty, login works, build tooling passes.
 * Usage: node apps/web/scripts/verify-production-reset.mjs [baseUrl]
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3000";
const DEV_EMAIL = "owner@st-manager.local";
const DEV_PASSWORD = "devpassword";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args, label) {
  const result = spawnSync(command, args, { cwd: repoRoot, stdio: "pipe", encoding: "utf8" });
  assert(result.status === 0, `${label} failed`);
  return result;
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
  });
  const body = await res.json();
  assert(res.ok && body.success, `Login failed: ${res.status}`);
  return body.data.accessToken;
}

async function listClients(token) {
  const res = await fetch(`${BASE}/api/clients?page=1&pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  assert(body.success, "List clients failed");
  return body.data;
}

async function main() {
  console.log(`\n=== Verify production reset @ ${BASE} ===\n`);

  const health = await fetch(`${BASE}/api/health`);
  assert(health.ok, `API not reachable at ${BASE}`);

  const token = await login();
  console.log("✓ Login works");

  const clients = await listClients(token);
  assert(clients.length === 0, `Expected 0 clients, found ${clients.length}`);
  console.log("✓ API clients empty");

  run("pnpm", ["typecheck"], "typecheck");
  console.log("✓ typecheck passed");

  run("pnpm", ["build"], "build");
  console.log("✓ build passed");

  console.log("\nBrowser checks (manual):");
  console.log("  • Run production-reset-localstorage.js in DevTools console");
  console.log("  • Dashboard / Projects / Bookings / Payments / Reports show zero records");
  console.log("  • Settings → Services, Booking Slots, WhatsApp templates still present\n");
}

main().catch((error) => {
  console.error("\n✗", error.message);
  process.exit(1);
});
