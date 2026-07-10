#!/usr/bin/env node
/**
 * Platform Admin Phase 2 smoke test (studio management).
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
  console.log("=== Platform Admin Phase 2 Smoke ===\n");
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    fail("Env", "PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD required");
    process.exit(1);
  }

  const health = await (await fetch(`${API}/health`)).json();
  health.status === "ok" ? pass("API health") : fail("API health", JSON.stringify(health));

  for (const path of ["/platform-admin", "/platform-admin/login", "/platform-admin/audit-logs"]) {
    const code = (await fetch(`${WEB}${path}`)).status;
    code === 200 ? pass(`Web ${path}`) : fail(`Web ${path}`, `HTTP ${code}`);
  }

  const login = await (
    await fetch(`${API}/platform-admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    })
  ).json();
  if (!login.data?.accessToken) {
    fail("Platform admin login", JSON.stringify(login));
    process.exit(1);
  }
  pass("Platform admin login");
  const token = login.data.accessToken;
  const auth = { Authorization: `Bearer ${token}` };

  const dash = await (await fetch(`${API}/platform-admin/dashboard`, { headers: auth })).json();
  if (
    typeof dash.data?.activeStudios === "number" &&
    typeof dash.data?.disabledStudios === "number" &&
    typeof dash.data?.verifiedUsers === "number"
  ) {
    pass("Dashboard studio summary cards");
  } else {
    fail("Dashboard summary", JSON.stringify(dash));
  }

  // Create a disposable studio via register
  const ts = Date.now();
  const ownerEmail = `pa2-owner-${ts}@stmanager.app`;
  const ownerPass = `OwnerPass!${ts}`;
  const reg = await (
    await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studioName: `PA2 Studio ${ts}`,
        ownerName: "PA2 Owner",
        email: ownerEmail,
        password: ownerPass,
        confirmPassword: ownerPass,
      }),
    })
  ).json();
  if (!reg.data?.accessToken || !reg.data?.user?.studioId) {
    fail("Create smoke studio", JSON.stringify(reg));
    process.exit(1);
  }
  pass("Create smoke studio");
  const studioId = reg.data.user.studioId;
  const ownerToken = reg.data.accessToken;

  const list = await (
    await fetch(`${API}/platform-admin/studios?search=${encodeURIComponent(`PA2 Studio ${ts}`)}`, {
      headers: auth,
    })
  ).json();
  const found = list.data?.find((s) => s.id === studioId);
  found ? pass("List/search studios") : fail("List/search studios", JSON.stringify(list));

  const detail = await (
    await fetch(`${API}/platform-admin/studios/${studioId}`, { headers: auth })
  ).json();
  detail.data?.id === studioId ? pass("Studio detail") : fail("Studio detail", JSON.stringify(detail));

  // Studio owner cannot access platform endpoints
  const forbidden = await fetch(`${API}/platform-admin/studios`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  forbidden.status === 403
    ? pass("Studio owner 403 on platform studios")
    : fail("Studio owner 403", `HTTP ${forbidden.status}`);

  // Disable
  const disabled = await (
    await fetch(`${API}/platform-admin/studios/${studioId}/disable`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  disabled.data?.status === "disabled"
    ? pass("Disable studio")
    : fail("Disable studio", JSON.stringify(disabled));

  // Owner login blocked
  const blockedLogin = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ownerEmail, password: ownerPass }),
  });
  const blockedBody = await blockedLogin.json();
  blockedLogin.status === 401 &&
  String(blockedBody.message || "").includes("disabled")
    ? pass("Disabled studio cannot login")
    : fail("Disabled studio login", JSON.stringify(blockedBody));

  // Owner API blocked with existing token
  const blockedApi = await fetch(`${API}/team-members`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  blockedApi.status === 401
    ? pass("Disabled studio cannot use API")
    : fail("Disabled studio API", `HTTP ${blockedApi.status}`);

  // Enable
  const enabled = await (
    await fetch(`${API}/platform-admin/studios/${studioId}/enable`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  enabled.data?.status === "active"
    ? pass("Enable studio")
    : fail("Enable studio", JSON.stringify(enabled));

  // Soft delete requires DELETE
  const badDelete = await fetch(`${API}/platform-admin/studios/${studioId}/delete`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: "NOPE" }),
  });
  badDelete.status >= 400
    ? pass("Delete requires DELETE confirmation")
    : fail("Delete confirmation", `HTTP ${badDelete.status}`);

  const deleted = await (
    await fetch(`${API}/platform-admin/studios/${studioId}/delete`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    })
  ).json();
  deleted.data?.status === "archived"
    ? pass("Soft delete archives studio")
    : fail("Soft delete", JSON.stringify(deleted));

  const audits = await (await fetch(`${API}/platform-admin/audit-logs`, { headers: auth })).json();
  const actions = (audits.data || []).map((a) => a.action);
  const needed = ["platform_admin.login", "studio.disabled", "studio.enabled", "studio.deleted"];
  needed.every((a) => actions.includes(a))
    ? pass("Audit log records actions")
    : fail("Audit log", JSON.stringify(actions.slice(0, 10)));

  const failed = results.filter((r) => !r[1]);
  console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
  console.log(failed.length ? "RESULT: FAIL" : "RESULT: PASS");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
