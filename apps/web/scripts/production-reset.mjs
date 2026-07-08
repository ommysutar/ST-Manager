#!/usr/bin/env node
/**
 * ST Manager v1.0 production reset — API database + instructions for browser localStorage.
 *
 * Usage:
 *   node apps/web/scripts/production-reset.mjs [apiBaseUrl]
 *
 * Then open the web app, sign in, paste production-reset-localstorage.js in the browser console.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3000";
const DEV_EMAIL = "owner@st-manager.local";
const DEV_PASSWORD = "devpassword";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../..");

function runDatabaseReset() {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@st-manager/database", "exec", "tsx", "scripts/production-reset.ts"],
    { cwd: repoRoot, stdio: "inherit", env: process.env },
  );

  if (result.status !== 0) {
    throw new Error("Database production reset failed");
  }
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

async function purgeApiClients() {
  try {
    const health = await fetch(`${BASE}/api/health`);
    if (!health.ok) {
      console.log(`API not reachable at ${BASE} — skipped live client purge (database reset still ran).`);
      return;
    }

    const token = await login();
    const clients = await listAllClients(token);
    for (const client of clients) {
      await deleteClient(token, client.id);
    }

    const remaining = await listAllClients(token);
    console.log(`API clients after purge: ${remaining.length}`);
  } catch (error) {
    console.log(`API client purge skipped: ${error instanceof Error ? error.message : error}`);
  }
}

async function main() {
  console.log("\n=== ST Manager v1.0 Production Reset ===\n");

  console.log("Step 1: Reset API database (clients, bookings, sessions, invoices)…");
  runDatabaseReset();

  console.log("\nStep 2: Purge any remaining API clients via HTTP…");
  await purgeApiClients();

  console.log("\nStep 3: Clear browser operational localStorage");
  console.log("  Open the web app, sign in, open DevTools → Console, and paste:\n");
  const snippet = readFileSync(join(__dirname, "production-reset-localstorage.js"), "utf8");
  console.log(snippet);
  console.log("\nThen reload the page. Dashboard, Clients, Projects, Bookings, Payments, and Reports should be empty.");
  console.log("Settings (profile, services, slots, studios, WhatsApp templates) are preserved.\n");
}

main().catch((error) => {
  console.error("Production reset failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
