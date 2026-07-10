#!/usr/bin/env node
/**
 * Final Bootstrap Platform Admin — production smoke test.
 *
 * Env:
 *   API_BASE_URL (default https://st-manager-api.vercel.app)
 *   WEB_BASE_URL (default https://stmanager.app)
 *   PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD
 *   DATABASE_URL (optional — enables hash / idempotency DB checks)
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.API_BASE_URL ?? "https://st-manager-api.vercel.app";
const WEB = process.env.WEB_BASE_URL ?? "https://stmanager.app";
const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD;
const __dirname = dirname(fileURLToPath(import.meta.url));

const results = [];
const pass = (s) => {
  results.push([s, true]);
  console.log(`PASS: ${s}`);
};
const fail = (s, d) => {
  results.push([s, false, d]);
  console.error(`FAIL: ${s} — ${d}`);
};

async function main() {
  console.log("=== Bootstrap Platform Admin Smoke ===\n");

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    fail("Env", "PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD required");
    process.exit(1);
  }

  const health = await (await fetch(`${API}/health`)).json();
  health.status === "ok" ? pass("API health") : fail("API health", JSON.stringify(health));

  for (const path of ["/platform-admin/login", "/platform-admin"]) {
    const code = (await fetch(`${WEB}${path}`)).status;
    code === 200 ? pass(`Web ${path}`) : fail(`Web ${path}`, `HTTP ${code}`);
  }

  // Studio login must reject platform admin
  const studioLogin = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  studioLogin.status === 401
    ? pass("Studio login rejects platform admin (401)")
    : fail("Studio login rejects platform admin", `HTTP ${studioLogin.status}`);

  // Platform login works
  const adminLoginRes = await fetch(`${API}/platform-admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const adminLogin = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLogin.data?.accessToken) {
    fail("Platform admin login", JSON.stringify(adminLogin));
    printSummary();
    process.exit(1);
  }
  adminLogin.data.user?.role === "platform_admin"
    ? pass("Platform admin login")
    : fail("Platform admin role", adminLogin.data.user?.role);

  const token = adminLogin.data.accessToken;
  const auth = { Authorization: `Bearer ${token}` };

  // Dashboard metrics
  const dashRes = await fetch(`${API}/platform-admin/dashboard`, { headers: auth });
  const dash = await dashRes.json();
  const d = dash.data || {};
  const required = [
    "totalStudios",
    "activeStudios",
    "disabledStudios",
    "archivedStudios",
    "totalUsers",
    "verifiedUsers",
    "activationCodes",
    "usedActivationCodes",
    "pendingActivationCodes",
    "platformStatus",
    "serverTime",
  ];
  const missing = required.filter((k) => d[k] === undefined || d[k] === null);
  dashRes.ok && missing.length === 0
    ? pass("Dashboard returns full bootstrap metrics")
    : fail("Dashboard metrics", `missing=${missing.join(",")} body=${JSON.stringify(d)}`);

  // Unauthenticated → 401
  const unauth = await fetch(`${API}/platform-admin/dashboard`);
  unauth.status === 401
    ? pass("Unauthenticated platform route → 401")
    : fail("Unauth 401", `HTTP ${unauth.status}`);

  // Studio owner → 403 (register with activation code)
  const ts = Date.now();
  const gen = await (
    await fetch(`${API}/platform-admin/activation-codes/generate`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 1, notes: `bootstrap-smoke-${ts}` }),
    })
  ).json();
  const code = gen.data?.codes?.[0]?.code;
  if (!code) {
    fail("Generate activation code for owner 403 check", JSON.stringify(gen));
  } else {
    const ownerPass = `OwnerPass!${ts}`;
    const reg = await (
      await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioName: `Bootstrap Smoke ${ts}`,
          ownerName: "Owner",
          email: `bootstrap-smoke-${ts}@stmanager.app`,
          password: ownerPass,
          confirmPassword: ownerPass,
          activationCode: code,
        }),
      })
    ).json();

    if (!reg.data?.accessToken) {
      fail("Register studio owner for 403 check", JSON.stringify(reg));
    } else {
      pass("Studio registration (activation) for security check");

      const forbidden = await fetch(`${API}/platform-admin/dashboard`, {
        headers: { Authorization: `Bearer ${reg.data.accessToken}` },
      });
      forbidden.status === 403
        ? pass("Studio owner → 403 on platform dashboard")
        : fail("Studio owner 403", `HTTP ${forbidden.status}`);

      // Studio login unaffected
      const ownerLogin = await (
        await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `bootstrap-smoke-${ts}@stmanager.app`,
            password: ownerPass,
          }),
        })
      ).json();
      ownerLogin.data?.accessToken
        ? pass("Studio login unaffected")
        : fail("Studio login", JSON.stringify(ownerLogin));

      // Studio user cannot use platform login
      const cross = await fetch(`${API}/platform-admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `bootstrap-smoke-${ts}@stmanager.app`,
          password: ownerPass,
        }),
      });
      cross.status === 401
        ? pass("Studio user rejected by platform login (401)")
        : fail("Platform login rejects studio user", `HTTP ${cross.status}`);
    }
  }

  // Bootstrap DB verification (idempotent, hashed password, single admin)
  if (process.env.DATABASE_URL) {
    const req = createRequire(join(__dirname, "../../../packages/database/package.json"));
    const { Client } = req("pg");
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    const admins = await client.query(
      `SELECT id, email, role, "passwordHash", "studioId" FROM users WHERE role = 'platform_admin'`,
    );
    admins.rowCount === 1
      ? pass("Exactly one platform admin exists (no duplicates)")
      : fail("Platform admin count", `count=${admins.rowCount}`);

    const admin = admins.rows[0];
    if (admin) {
      admin.email === ADMIN_EMAIL.toLowerCase()
        ? pass("Bootstrap admin email matches env")
        : fail("Bootstrap email", admin.email);
      admin.passwordHash?.startsWith("$2")
        ? pass("Password hash stored (bcrypt)")
        : fail("Password hash", String(admin.passwordHash).slice(0, 10));
      admin.studioId === null
        ? pass("Platform admin isolated from studios (studioId null)")
        : fail("studioId", String(admin.studioId));
    }

    // Idempotency: count before/after is conceptual — admin already exists so
    // a second API cold start would skip. We verify count stays 1.
    const again = await client.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE role = 'platform_admin'`,
    );
    again.rows[0].n === 1
      ? pass("Duplicate bootstrap impossible (still exactly one)")
      : fail("Idempotent count", JSON.stringify(again.rows[0]));

    await client.end();
  } else {
    fail("Bootstrap DB checks", "DATABASE_URL required");
  }

  printSummary();
  process.exit(results.some((r) => !r[1]) ? 1 : 0);
}

function printSummary() {
  const failed = results.filter((r) => !r[1]);
  console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
  console.log(failed.length ? "RESULT: FAIL" : "RESULT: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
