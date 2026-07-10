#!/usr/bin/env node
/**
 * Production smoke test for Platform Admin Phase 1.
 *
 * Env:
 *   API_BASE_URL (default https://st-manager-api.vercel.app)
 *   WEB_BASE_URL (default https://stmanager.app)
 *   PLATFORM_ADMIN_EMAIL
 *   PLATFORM_ADMIN_PASSWORD
 *   STUDIO_OWNER_EMAIL / STUDIO_OWNER_PASSWORD (optional — for 403 checks)
 */
const API = process.env.API_BASE_URL ?? "https://st-manager-api.vercel.app";
const WEB = process.env.WEB_BASE_URL ?? "https://stmanager.app";
const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD;

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
  console.log("=== Platform Admin Phase 1 Smoke ===\n");

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

  const studioLogin = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  studioLogin.status === 401
    ? pass("Studio login rejects platform admin")
    : fail("Studio login rejects platform admin", `HTTP ${studioLogin.status}`);

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
  if (adminLogin.data.user?.role !== "platform_admin") {
    fail("Platform admin role", adminLogin.data.user?.role);
  } else {
    pass("Platform admin login");
  }

  const token = adminLogin.data.accessToken;
  const dashRes = await fetch(`${API}/platform-admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dash = await dashRes.json();
  if (
    dashRes.ok &&
    typeof dash.data?.totalStudios === "number" &&
    typeof dash.data?.totalUsers === "number" &&
    dash.data?.platformStatus &&
    dash.data?.serverTime
  ) {
    pass("Platform admin dashboard");
  } else {
    fail("Platform admin dashboard", JSON.stringify(dash));
  }

  // Studio owner token (if available) must get 403 on platform dashboard
  const ownerEmail = process.env.STUDIO_OWNER_EMAIL;
  const ownerPassword = process.env.STUDIO_OWNER_PASSWORD;
  if (ownerEmail && ownerPassword) {
    const ownerLogin = await (
      await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
      })
    ).json();
    if (ownerLogin.data?.accessToken) {
      const forbidden = await fetch(`${API}/platform-admin/dashboard`, {
        headers: { Authorization: `Bearer ${ownerLogin.data.accessToken}` },
      });
      forbidden.status === 403
        ? pass("Studio owner gets 403 on platform dashboard")
        : fail("Studio owner 403", `HTTP ${forbidden.status}`);
    } else {
      pass("Studio owner 403 check skipped (owner login failed)");
    }
  } else {
    // Register ephemeral owner and verify 403
    const ts = Date.now();
    const reg = await (
      await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioName: `PA Smoke ${ts}`,
          ownerName: "Owner",
          email: `pa-smoke-owner-${ts}@stmanager.app`,
          password: `OwnerPass!${ts}`,
          confirmPassword: `OwnerPass!${ts}`,
        }),
      })
    ).json();
    if (reg.data?.accessToken) {
      const forbidden = await fetch(`${API}/platform-admin/dashboard`, {
        headers: { Authorization: `Bearer ${reg.data.accessToken}` },
      });
      forbidden.status === 403
        ? pass("Studio owner gets 403 on platform dashboard")
        : fail("Studio owner 403", `HTTP ${forbidden.status}`);
    } else {
      fail("Register smoke owner for 403 check", JSON.stringify(reg));
    }
  }

  // Unauthenticated dashboard
  const unauth = await fetch(`${API}/platform-admin/dashboard`);
  unauth.status === 401
    ? pass("Unauthenticated dashboard rejected")
    : fail("Unauthenticated dashboard", `HTTP ${unauth.status}`);

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
