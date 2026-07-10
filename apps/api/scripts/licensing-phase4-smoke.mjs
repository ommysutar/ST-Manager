#!/usr/bin/env node
/**
 * Commercial Licensing Phase 4 — smoke test.
 * Covers: generate, export, register with license, security 403, revoke.
 * Requires PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD.
 */
const API = process.env.API_BASE_URL ?? "https://st-manager-api.vercel.app";
const WEB = process.env.WEB_BASE_URL ?? process.env.APP_BASE_URL ?? "https://stmanager.app";
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
    body: JSON.stringify({
      confirmPassword: payload.password,
      ...payload,
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  console.log("=== Commercial Licensing Phase 4 Smoke ===\n");
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    fail("Env", "PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD required");
    process.exit(1);
  }

  const health = await (await fetch(`${API}/health`)).json();
  health.status === "ok" ? pass("API health") : fail("API health", JSON.stringify(health));

  const licensingPage = await fetch(`${WEB}/platform-admin/licensing`);
  licensingPage.status === 200
    ? pass("Web /platform-admin/licensing")
    : fail("Licensing page", `HTTP ${licensingPage.status}`);

  const activationSettings = await fetch(`${WEB}/settings/activation`);
  activationSettings.status === 200
    ? pass("Web /settings/activation")
    : fail("Activation settings page", `HTTP ${activationSettings.status}`);

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
    await fetch(`${API}/platform-admin/licenses/generate`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: 5,
        licenseType: "TRIAL",
        notes: `phase4-smoke-${ts}`,
        customerName: `Smoke Customer ${ts}`,
      }),
    })
  ).json();
  const licenses = generated.data?.licenses || [];
  if (licenses.length < 5) {
    fail("Generate licenses", JSON.stringify(generated));
    process.exit(1);
  }
  if (licenses[0]?.status !== "PENDING" || licenses[0]?.licenseType !== "TRIAL") {
    fail("Generate license DTO mapping", JSON.stringify(licenses[0]));
  } else {
    pass("Generate licenses (PENDING / TRIAL)");
  }

  const [validLicense, revokeTarget, disableTarget, spareA, spareB] = licenses;

  const exportRes = await fetch(`${API}/platform-admin/licenses/export`, { headers: auth });
  const exportBody = await exportRes.json().catch(() => ({}));
  if (exportRes.ok && exportBody.data?.csv && String(exportBody.data.csv).includes("licenseType")) {
    pass("Export licenses CSV");
  } else {
    fail("Export licenses CSV", JSON.stringify(exportBody));
  }

  const listRes = await (
    await fetch(`${API}/platform-admin/licenses?page=1&pageSize=5`, { headers: auth })
  ).json();
  if (listRes.summary?.revenuePlaceholder && Array.isArray(listRes.data)) {
    pass("List licenses with summary + revenue placeholder");
  } else {
    fail("List licenses", JSON.stringify(listRes));
  }

  // Activation-codes path must still work
  const legacyGenerate = await (
    await fetch(`${API}/platform-admin/activation-codes/generate`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 1, notes: `phase4-legacy-${ts}` }),
    })
  ).json();
  if (legacyGenerate.data?.codes?.[0]?.status === "ACTIVE") {
    pass("Legacy activation-codes generate still ACTIVE");
  } else {
    fail("Legacy activation-codes", JSON.stringify(legacyGenerate));
  }

  const registered = await registerAttempt({
    studioName: `P4 License Studio ${ts}`,
    ownerName: `P4 Owner ${ts}`,
    email: `p4-owner-${ts}@example.com`,
    password: ownerPass,
    activationCode: validLicense.code,
  });
  if (registered.status === 201 || registered.status === 200) {
    pass("Register with trial license");
  } else {
    fail("Register with trial license", `${registered.status} ${errorMessage(registered.body)}`);
  }

  const ownerToken = registered.body?.data?.accessToken;
  if (ownerToken) {
    const studioLicense = await fetch(`${API}/studio-license`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const studioBody = await studioLicense.json().catch(() => ({}));
    if (
      studioLicense.ok &&
      studioBody.data?.verified === true &&
      studioBody.data?.licenseType === "TRIAL" &&
      studioBody.data?.expiresAt
    ) {
      pass("Studio license GET (verified trial)");
    } else {
      fail("Studio license GET", `${studioLicense.status} ${JSON.stringify(studioBody)}`);
    }

    const forbidden = await fetch(`${API}/platform-admin/licenses`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    forbidden.status === 403
      ? pass("Studio owner blocked from platform-admin licenses (403)")
      : fail("Security 403", `HTTP ${forbidden.status}`);
  } else {
    fail("Owner token missing after register", JSON.stringify(registered.body));
  }

  const reused = await registerAttempt({
    studioName: `P4 Reuse ${ts}`,
    ownerName: `P4 Reuse Owner ${ts}`,
    email: `p4-reuse-${ts}@example.com`,
    password: ownerPass,
    activationCode: validLicense.code,
  });
  errorMessage(reused.body).toLowerCase().includes("already used")
    ? pass("Reject reused license")
    : fail("Reject reused license", errorMessage(reused.body));

  const revoked = await (
    await fetch(`${API}/platform-admin/licenses/${encodeURIComponent(revokeTarget.id)}/revoke`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  if (revoked.data?.status === "REVOKED" && revoked.data?.revokedAt) {
    pass("Revoke pending license");
  } else {
    fail("Revoke license", JSON.stringify(revoked));
  }

  const revokedRegister = await registerAttempt({
    studioName: `P4 Revoked ${ts}`,
    ownerName: `P4 Revoked Owner ${ts}`,
    email: `p4-revoked-${ts}@example.com`,
    password: ownerPass,
    activationCode: revokeTarget.code,
  });
  errorMessage(revokedRegister.body).toLowerCase().includes("revoked")
    ? pass("Reject revoked license on register")
    : fail("Reject revoked license", errorMessage(revokedRegister.body));

  const disabled = await (
    await fetch(`${API}/platform-admin/licenses/${encodeURIComponent(disableTarget.id)}/disable`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  disabled.data?.status === "DISABLED"
    ? pass("Disable license")
    : fail("Disable license", JSON.stringify(disabled));

  const duplicated = await (
    await fetch(`${API}/platform-admin/licenses/${encodeURIComponent(spareA.id)}/duplicate`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  duplicated.data?.status === "PENDING" && duplicated.data?.code !== spareA.code
    ? pass("Duplicate license")
    : fail("Duplicate license", JSON.stringify(duplicated));

  // Keep spareB referenced so unused-var linters don't complain in editors
  if (!spareB?.id) {
    fail("Spare license missing", "expected 5 generated licenses");
  }

  const failed = results.filter(([, ok]) => !ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
