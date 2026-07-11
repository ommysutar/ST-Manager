#!/usr/bin/env node
/**
 * Production reset + User Management + Profile smoke.
 * Requires PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD.
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
  console.log("=== Production Reset / User Management Smoke ===\n");
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    fail("Env", "PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD required");
    process.exit(1);
  }

  const health = await (await fetch(`${API}/health`)).json();
  health.status === "ok" ? pass("API health") : fail("API health", JSON.stringify(health));

  for (const path of [
    "/platform-admin/login",
    "/platform-admin",
    "/platform-admin/users",
    "/platform-admin/profile",
  ]) {
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
  const auth = { Authorization: `Bearer ${login.data.accessToken}` };

  const dash = await (await fetch(`${API}/platform-admin/dashboard`, { headers: auth })).json();
  dash.data?.totalStudios === 0 && dash.data?.totalUsers === 0
    ? pass("Fresh platform: 0 studios, 0 studio users")
    : fail("Fresh counts", JSON.stringify(dash.data));

  const profile = await (await fetch(`${API}/platform-admin/profile`, { headers: auth })).json();
  profile.data?.email === ADMIN_EMAIL.toLowerCase()
    ? pass("Profile GET")
    : fail("Profile GET", JSON.stringify(profile));

  const studios = await (await fetch(`${API}/platform-admin/studios`, { headers: auth })).json();
  Array.isArray(studios.data) && studios.meta?.total === 0
    ? pass("User Management list empty")
    : fail("Studios list", JSON.stringify(studios));

  // Generate license + register first studio
  const gen = await (
    await fetch(`${API}/platform-admin/licenses/generate`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 1, licenseType: "LIFETIME", notes: "post-reset-smoke" }),
    })
  ).json();
  const code = gen.data?.licenses?.[0]?.code || gen.data?.codes?.[0]?.code;
  if (!code) {
    fail("Generate license", JSON.stringify(gen));
    process.exit(1);
  }
  pass("Generate license for first studio");

  const ts = Date.now();
  const ownerPass = `OwnerPass!${ts}`;
  const ownerEmail = `launch-owner-${ts}@stmanager.app`;
  const reg = await (
    await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studioName: `Launch Studio ${ts}`,
        ownerName: "Launch Owner",
        email: ownerEmail,
        password: ownerPass,
        confirmPassword: ownerPass,
        activationCode: code,
      }),
    })
  ).json();
  reg.data?.accessToken
    ? pass("Fresh registration with license")
    : fail("Registration", JSON.stringify(reg));

  const after = await (await fetch(`${API}/platform-admin/studios`, { headers: auth })).json();
  after.meta?.total === 1 && after.data?.[0]?.ownerEmail === ownerEmail
    ? pass("User Management shows new studio")
    : fail("Studio after register", JSON.stringify(after));

  const studioId = after.data?.[0]?.id;
  const disabled = await (
    await fetch(`${API}/platform-admin/studios/${studioId}/disable`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  disabled.data?.status === "disabled"
    ? pass("Disable studio")
    : fail("Disable", JSON.stringify(disabled));

  const enabled = await (
    await fetch(`${API}/platform-admin/studios/${studioId}/enable`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  enabled.data?.status === "active" ? pass("Enable studio") : fail("Enable", JSON.stringify(enabled));

  const soft = await (
    await fetch(`${API}/platform-admin/studios/${studioId}/delete`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    })
  ).json();
  soft.data?.status === "archived"
    ? pass("Soft delete (archive)")
    : fail("Soft delete", JSON.stringify(soft));

  // Register second studio for permanent delete
  const gen2 = await (
    await fetch(`${API}/platform-admin/licenses/generate`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 1, licenseType: "LIFETIME", notes: "perm-delete-smoke" }),
    })
  ).json();
  const code2 = gen2.data?.licenses?.[0]?.code || gen2.data?.codes?.[0]?.code;
  const ts2 = Date.now();
  const owner2 = `perm-owner-${ts2}@stmanager.app`;
  const pass2 = `OwnerPass!${ts2}`;
  await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studioName: `Perm Delete ${ts2}`,
      ownerName: "Perm Owner",
      email: owner2,
      password: pass2,
      confirmPassword: pass2,
      activationCode: code2,
    }),
  });
  const list2 = await (await fetch(`${API}/platform-admin/studios?status=active`, { headers: auth })).json();
  const permId = (list2.data || []).find((s) => s.ownerEmail === owner2)?.id;
  if (!permId) {
    fail("Setup permanent delete studio", JSON.stringify(list2));
  } else {
    const perm = await fetch(`${API}/platform-admin/studios/${permId}/permanent-delete`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE FOREVER" }),
    });
    perm.ok
      ? pass("Permanent delete studio")
      : fail("Permanent delete", await perm.text());
  }

  // Profile update requires current password — dry-run wrong password
  const badProfile = await fetch(`${API}/platform-admin/profile/update`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "WrongPass!123", email: ADMIN_EMAIL }),
  });
  badProfile.status === 401 || badProfile.status === 400
    ? pass("Profile rejects wrong current password")
    : fail("Profile wrong password", `HTTP ${badProfile.status}`);

  const failed = results.filter((r) => !r[1]);
  console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
  console.log(failed.length ? "RESULT: FAIL" : "RESULT: PASS");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
