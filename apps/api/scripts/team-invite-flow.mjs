#!/usr/bin/env node
/**
 * End-to-end: invite → accept → login
 * Usage: API must be running on localhost:4000
 */
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createSqlitePrismaClient } from "../../../packages/database/dist/sqlite.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
process.env.SQLITE_URL ??= `file:${resolve(__dirname, "../../../packages/database/prisma/sqlite/dev.db")}`;

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";
const OWNER_EMAIL = process.env.DEV_OWNER_EMAIL ?? "owner@st-manager.local";
const PASSWORD = process.env.DEV_AUTH_PASSWORD ?? "devpassword";
const INVITE_EMAIL = `invite-flow-${Date.now()}@st-manager.local`;
const ACCEPT_PASSWORD = "testpass123";
const PLAIN_TOKEN = `smoke-token-${Date.now()}`;

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok || !body.data?.accessToken) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(body)}`);
  }
  return body.data.accessToken;
}

async function main() {
  const ownerToken = await login(OWNER_EMAIL, PASSWORD);

  const inviteRes = await fetch(`${BASE_URL}/team-members/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      fullName: "Flow Tester",
      email: INVITE_EMAIL,
      role: "assistant",
    }),
  });
  const inviteBody = await inviteRes.json();
  if (!inviteRes.ok || !inviteBody.data?.id) {
    throw new Error(`Invite failed: ${JSON.stringify(inviteBody)}`);
  }

  const invitationId = inviteBody.data.id;
  const tokenHash = createHash("sha256").update(PLAIN_TOKEN).digest("hex");

  const prisma = createSqlitePrismaClient();
  await prisma.studioInvitation.update({
    where: { id: invitationId },
    data: { tokenHash },
  });
  await prisma.$disconnect();

  const verifyRes = await fetch(`${BASE_URL}/invitations/${encodeURIComponent(PLAIN_TOKEN)}`);
  const verifyBody = await verifyRes.json();
  if (!verifyRes.ok || verifyBody.data?.email !== INVITE_EMAIL) {
    throw new Error(`Verify failed: ${JSON.stringify(verifyBody)}`);
  }

  const acceptRes = await fetch(`${BASE_URL}/invitations/${encodeURIComponent(PLAIN_TOKEN)}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password: ACCEPT_PASSWORD,
      confirmPassword: ACCEPT_PASSWORD,
    }),
  });
  const acceptBody = await acceptRes.json();
  if (!acceptRes.ok || !acceptBody.data?.accessToken) {
    throw new Error(`Accept failed: ${JSON.stringify(acceptBody)}`);
  }

  const memberToken = await login(INVITE_EMAIL, ACCEPT_PASSWORD);
  if (!memberToken) {
    throw new Error("Member login after accept failed");
  }

  const listRes = await fetch(`${BASE_URL}/team-members`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  if (listRes.status !== 403) {
    const listBody = await listRes.json();
    throw new Error(`Assistant should not access team list, got ${listRes.status}: ${JSON.stringify(listBody)}`);
  }

  console.log("Team invite flow passed: invite → verify → accept → login → assistant blocked from team management");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
