#!/usr/bin/env node
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
  console.log("=== Activation Codes Phase 1 Smoke ===\n");
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    fail("Env", "PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD required");
    process.exit(1);
  }

  const health = await (await fetch(`${API}/health`)).json();
  health.status === "ok" ? pass("API health") : fail("API health", JSON.stringify(health));

  const page = await fetch(`${WEB}/platform-admin/activation-codes`);
  page.status === 200
    ? pass("Web /platform-admin/activation-codes")
    : fail("Web page", `HTTP ${page.status}`);

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

  // Studio owner 403
  const ts = Date.now();
  const ownerPass = `OwnerPass!${ts}`;
  const reg = await (
    await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studioName: `Act Smoke ${ts}`,
        ownerName: "Owner",
        email: `act-smoke-${ts}@stmanager.app`,
        password: ownerPass,
        confirmPassword: ownerPass,
      }),
    })
  ).json();
  if (!reg.data?.accessToken) {
    fail("Register still works without activation code", JSON.stringify(reg));
    process.exit(1);
  }
  pass("Registration unchanged (no activation required)");

  const forbidden = await fetch(`${API}/platform-admin/activation-codes`, {
    headers: { Authorization: `Bearer ${reg.data.accessToken}` },
  });
  forbidden.status === 403
    ? pass("Studio owner 403 on activation codes")
    : fail("Owner 403", `HTTP ${forbidden.status}`);

  const generated = await (
    await fetch(`${API}/platform-admin/activation-codes/generate`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 5, notes: `smoke-${ts}` }),
    })
  ).json();
  const codes = generated.data?.codes || [];
  if (codes.length === 5 && codes.every((c) => /^STM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c.code))) {
    pass("Generate 5 unique STM codes");
  } else {
    fail("Generate codes", JSON.stringify(generated));
  }

  const unique = new Set(codes.map((c) => c.code));
  unique.size === 5 ? pass("No duplicate codes") : fail("Duplicates", String(unique.size));

  const list = await (
    await fetch(`${API}/platform-admin/activation-codes?search=${encodeURIComponent(`smoke-${ts}`)}`, {
      headers: auth,
    })
  ).json();
  list.summary && typeof list.summary.totalCodes === "number"
    ? pass("List + summary cards")
    : fail("List summary", JSON.stringify(list));

  const first = codes[0];
  const disabled = await (
    await fetch(`${API}/platform-admin/activation-codes/${first.id}/disable`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  disabled.data?.status === "DISABLED"
    ? pass("Disable code")
    : fail("Disable", JSON.stringify(disabled));

  const enabled = await (
    await fetch(`${API}/platform-admin/activation-codes/${first.id}/enable`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  enabled.data?.status === "ACTIVE"
    ? pass("Enable code")
    : fail("Enable", JSON.stringify(enabled));

  const badDelete = await fetch(`${API}/platform-admin/activation-codes/${first.id}/delete`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: "NOPE" }),
  });
  badDelete.status >= 400
    ? pass("Delete requires DELETE confirmation")
    : fail("Delete confirmation", `HTTP ${badDelete.status}`);

  const deleted = await fetch(`${API}/platform-admin/activation-codes/${first.id}/delete`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: "DELETE" }),
  });
  deleted.ok ? pass("Delete code") : fail("Delete", await deleted.text());

  const exported = await (
    await fetch(`${API}/platform-admin/activation-codes/export`, { headers: auth })
  ).json();
  exported.data?.csv?.includes("code,status")
    ? pass("Export CSV")
    : fail("Export", JSON.stringify(exported).slice(0, 200));

  const audits = await (await fetch(`${API}/platform-admin/audit-logs`, { headers: auth })).json();
  const actions = (audits.data || []).map((a) => a.action);
  ["activation_code.generated", "activation_code.disabled", "activation_code.enabled", "activation_code.deleted"].every(
    (a) => actions.includes(a),
  )
    ? pass("Audit log records activation actions")
    : fail("Audit", JSON.stringify(actions.slice(0, 12)));

  const failed = results.filter((r) => !r[1]);
  console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
  console.log(failed.length ? "RESULT: FAIL" : "RESULT: PASS");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
