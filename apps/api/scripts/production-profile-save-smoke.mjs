#!/usr/bin/env node
/**
 * Production smoke: studio profile save + team member update persistence.
 * Requires OWNER_EMAIL / OWNER_PASSWORD (studio owner).
 */
const API = process.env.API_BASE_URL ?? "https://st-manager-api.vercel.app";
const WEB = process.env.WEB_BASE_URL ?? "https://stmanager.app";
const EMAIL = process.env.OWNER_EMAIL;
const PASSWORD = process.env.OWNER_PASSWORD;

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
  console.log("=== Studio Profile Save Smoke ===\n");
  if (!EMAIL || !PASSWORD) {
    fail("Env", "OWNER_EMAIL / OWNER_PASSWORD required");
    process.exit(1);
  }

  const health = await (await fetch(`${API}/health`)).json();
  health.status === "ok" ? pass("API health") : fail("API health", JSON.stringify(health));

  for (const path of ["/login", "/login/create-account", "/settings/team-members"]) {
    const code = (await fetch(`${WEB}${path}`)).status;
    code === 200 ? pass(`Web ${path}`) : fail(`Web ${path}`, `HTTP ${code}`);
  }

  const login = await (
    await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
  ).json();
  if (!login.data?.accessToken) {
    fail("Owner login", JSON.stringify(login));
    process.exit(1);
  }
  pass("Owner login");
  const auth = { Authorization: `Bearer ${login.data.accessToken}` };

  const before = await (await fetch(`${API}/profile`, { headers: auth })).json();
  before.data?.id ? pass("GET /profile") : fail("GET /profile", JSON.stringify(before));

  const stamp = Date.now();
  const fullName = `Owner Profile ${stamp}`;
  const phone = `9${String(stamp).slice(-9)}`;
  const studioName = `Studio ${stamp}`;

  const updated = await (
    await fetch(`${API}/profile`, {
      method: "PATCH",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, studioName }),
    })
  ).json();

  updated.data?.fullName === fullName && updated.data?.phone === phone && updated.data?.studioName === studioName
    ? pass("PATCH /profile persists identity")
    : fail("PATCH /profile", JSON.stringify(updated));

  const again = await (await fetch(`${API}/profile`, { headers: auth })).json();
  again.data?.fullName === fullName && again.data?.phone === phone
    ? pass("Profile GET after update")
    : fail("Profile GET after update", JSON.stringify(again));

  const relogin = await (
    await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
  ).json();
  relogin.data?.user?.fullName === fullName
    ? pass("Re-login returns updated fullName")
    : fail("Re-login fullName", JSON.stringify(relogin.data?.user));

  const members = await (await fetch(`${API}/team-members`, { headers: auth })).json();
  const editable = (members.data || []).find(
    (m) => m.type === "member" && m.role !== "owner" && m.id !== login.data.user.id,
  );
  if (!editable) {
    pass("No non-owner member to edit (skipped)");
  } else {
    const memberName = `Member ${stamp}`;
    const memberPhone = `8${String(stamp).slice(-9)}`;
    const patched = await (
      await fetch(`${API}/team-members/${editable.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: memberName,
          phone: memberPhone,
          role: editable.role,
        }),
      })
    ).json();
    patched.data?.fullName === memberName
      ? pass("Team member PATCH persists")
      : fail("Team member PATCH", JSON.stringify(patched));

    const listed = await (await fetch(`${API}/team-members`, { headers: auth })).json();
    const found = (listed.data || []).find((m) => m.id === editable.id);
    found?.fullName === memberName
      ? pass("Team member list shows updated name")
      : fail("Team member list", JSON.stringify(found));
  }

  const failed = results.filter((r) => !r[1]);
  console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
  console.log(failed.length ? "RESULT: FAIL" : "RESULT: PASS");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
