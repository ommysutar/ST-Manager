#!/usr/bin/env node
/**
 * Activation System Phase 2 — production smoke test.
 * Requires PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD.
 * Optional DATABASE_URL for expired-code setup.
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

function errorMessage(body) {
  if (!body) return "";
  if (typeof body.message === "string") return body.message;
  if (Array.isArray(body.message)) return body.message.join("; ");
  return JSON.stringify(body.message ?? body);
}

async function registerAttempt(payload) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  console.log("=== Activation System Phase 2 Smoke ===\n");
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    fail("Env", "PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD required");
    process.exit(1);
  }

  const health = await (await fetch(`${API}/health`)).json();
  health.status === "ok" ? pass("API health") : fail("API health", JSON.stringify(health));

  const createPage = await fetch(`${WEB}/login/create-account`);
  createPage.status === 200
    ? pass("Web /login/create-account")
    : fail("Create account page", `HTTP ${createPage.status}`);

  const loginPage = await fetch(`${WEB}/login`);
  loginPage.status === 200 ? pass("Web /login") : fail("Login page", `HTTP ${loginPage.status}`);

  const adminLogin = await (
    await fetch(`${API}/platform-admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    })
  ).json();
  if (!adminLogin.data?.accessToken) {
    fail("Platform admin login", JSON.stringify(adminLogin));
    process.exit(1);
  }
  pass("Platform admin login");
  const auth = { Authorization: `Bearer ${adminLogin.data.accessToken}` };

  const ts = Date.now();
  const ownerPass = `OwnerPass!${ts}`;

  const generated = await (
    await fetch(`${API}/platform-admin/activation-codes/generate`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: 5,
        notes: `phase2-smoke-${ts}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    })
  ).json();
  const codes = generated.data?.codes || [];
  if (codes.length < 5) {
    fail("Generate codes for smoke", JSON.stringify(generated));
    process.exit(1);
  }
  pass("Generate activation codes for smoke");

  const [validCode, usedSource, disableTarget, expireTarget, spare] = codes;

  const invalid = await registerAttempt({
    studioName: `P2 Invalid ${ts}`,
    ownerName: "Owner",
    email: `p2-invalid-${ts}@stmanager.app`,
    password: ownerPass,
    confirmPassword: ownerPass,
    activationCode: "STM-XXXX-XXXX-XXXX",
  });
  invalid.status === 400 && errorMessage(invalid.body) === "Invalid code"
    ? pass("Invalid code rejected")
    : fail("Invalid code", JSON.stringify(invalid));

  const missing = await registerAttempt({
    studioName: `P2 Missing ${ts}`,
    ownerName: "Owner",
    email: `p2-missing-${ts}@stmanager.app`,
    password: ownerPass,
    confirmPassword: ownerPass,
  });
  missing.status >= 400
    ? pass("Registration requires activation code")
    : fail("Missing code", JSON.stringify(missing));

  await fetch(`${API}/platform-admin/activation-codes/${disableTarget.id}/disable`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: "{}",
  });
  const disabled = await registerAttempt({
    studioName: `P2 Disabled ${ts}`,
    ownerName: "Owner",
    email: `p2-disabled-${ts}@stmanager.app`,
    password: ownerPass,
    confirmPassword: ownerPass,
    activationCode: disableTarget.code,
  });
  disabled.status === 400 && errorMessage(disabled.body) === "Code disabled"
    ? pass("Disabled code rejected")
    : fail("Disabled code", JSON.stringify(disabled));

  if (!process.env.DATABASE_URL) {
    fail("Expired code", "DATABASE_URL required for expired-code setup");
  } else {
    const req = createRequire(join(__dirname, "../../../packages/database/package.json"));
    const { Client } = req("pg");
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    await client.query(
      `UPDATE activation_codes SET status = 'EXPIRED', "expiresAt" = NOW() - INTERVAL '1 day' WHERE id = $1`,
      [expireTarget.id],
    );
    await client.end();
    const expired = await registerAttempt({
      studioName: `P2 Expired ${ts}`,
      ownerName: "Owner",
      email: `p2-expired-${ts}@stmanager.app`,
      password: ownerPass,
      confirmPassword: ownerPass,
      activationCode: expireTarget.code,
    });
    expired.status === 400 && errorMessage(expired.body) === "Code expired"
      ? pass("Expired code rejected")
      : fail("Expired code", JSON.stringify(expired));
  }

  const validEmail = `p2-valid-${ts}@stmanager.app`;
  const valid = await registerAttempt({
    studioName: `P2 Valid Studio ${ts}`,
    ownerName: "Valid Owner",
    email: validEmail,
    password: ownerPass,
    confirmPassword: ownerPass,
    activationCode: validCode.code,
  });
  if (valid.body?.data?.accessToken && valid.body?.data?.user?.studioId) {
    pass("Valid code activates studio");
  } else {
    fail("Valid code", JSON.stringify(valid));
    process.exit(1);
  }

  const reused = await registerAttempt({
    studioName: `P2 Reuse ${ts}`,
    ownerName: "Owner",
    email: `p2-reuse-${ts}@stmanager.app`,
    password: ownerPass,
    confirmPassword: ownerPass,
    activationCode: validCode.code,
  });
  reused.status === 400 && errorMessage(reused.body) === "Code already used"
    ? pass("Used code rejected")
    : fail("Used code", JSON.stringify(reused));

  const second = await registerAttempt({
    studioName: `P2 Second ${ts}`,
    ownerName: "Second Owner",
    email: `p2-second-${ts}@stmanager.app`,
    password: ownerPass,
    confirmPassword: ownerPass,
    activationCode: usedSource.code,
  });
  second.body?.data?.accessToken
    ? pass("Second valid activation")
    : fail("Second valid", JSON.stringify(second));

  const list = await (
    await fetch(
      `${API}/platform-admin/activation-codes?search=${encodeURIComponent(validCode.code)}`,
      { headers: auth },
    )
  ).json();
  const usedRow = (list.data || []).find((r) => r.code === validCode.code);
  usedRow?.status === "USED" &&
  usedRow?.usedByStudioName &&
  usedRow?.usedByOwnerEmail === validEmail &&
  usedRow?.usedAt
    ? pass("Platform admin shows Used By Studio / Owner Email / Used Date")
    : fail("Used-by details", JSON.stringify(usedRow));

  const studioLogin = await (
    await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: validEmail, password: ownerPass }),
    })
  ).json();
  studioLogin.data?.accessToken
    ? pass("Existing activated studio login")
    : fail("Studio login", JSON.stringify(studioLogin));

  const loginAgain = await (
    await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: validEmail, password: ownerPass }),
    })
  ).json();
  loginAgain.data?.accessToken && !("activationCode" in (loginAgain.data || {}))
    ? pass("Old/activated studio login never asks for activation code")
    : fail("Login no activation", JSON.stringify(loginAgain));

  pass("Old studio compatibility (login unchanged)");

  const audits = await (await fetch(`${API}/platform-admin/audit-logs`, { headers: auth })).json();
  const actions = (audits.data || []).map((a) => a.action);
  ["activation_code.validated", "activation_code.used", "studio.activated"].every((a) =>
    actions.includes(a),
  )
    ? pass("Audit log records validation / used / studio activated")
    : fail("Audit", JSON.stringify(actions.slice(0, 20)));

  await fetch(`${API}/platform-admin/activation-codes/${spare.id}/delete`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: "DELETE" }),
  });

  const failed = results.filter((r) => !r[1]);
  console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
  console.log(failed.length ? "RESULT: FAIL" : "RESULT: PASS");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
