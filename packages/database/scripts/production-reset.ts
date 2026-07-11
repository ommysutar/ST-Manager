/**
 * One-time commercial launch production reset.
 * Keeps: platform_admin users, unused activation/license codes (ACTIVE),
 *        permissions, system role definitions, migrations.
 * Removes: all studios and studio-linked operational data, non-admin users,
 *          used activation codes, invitations, audit logs.
 *
 * Usage:
 *   NODE_ENV=production DATABASE_URL=... pnpm --filter @st-manager/database exec tsx scripts/production-reset.ts
 */
import "dotenv/config";

import { ACTIVATION_CODE_STATUSES, PLATFORM_ROLES } from "@st-manager/constants";

import { createSqlitePrismaClient, getPrisma } from "../src/index";

async function main(): Promise<void> {
  const usePostgres =
    process.env["NODE_ENV"] === "production" && Boolean(process.env["DATABASE_URL"]);
  const db = usePostgres ? getPrisma() : createSqlitePrismaClient();

  const beforeAdmins = await db.user.count({
    where: { role: PLATFORM_ROLES.PLATFORM_ADMIN },
  });
  if (beforeAdmins < 1) {
    throw new Error("Aborting reset: no platform_admin account found. Refusing to wipe production.");
  }

  const invoices = await db.invoice.deleteMany({});
  const sessions = await db.session.deleteMany({});
  const bookings = await db.booking.deleteMany({});
  const clients = await db.client.deleteMany({});
  const auditLogs = await db.auditLog.deleteMany({});
  const invitations = await db.studioInvitation.deleteMany({});

  const usedCodes = await db.activationCode.deleteMany({
    where: {
      OR: [
        { status: ACTIVATION_CODE_STATUSES.USED },
        { usedByStudioId: { not: null } },
      ],
    },
  });

  const studioRoles = await db.roleDefinition.deleteMany({
    where: { studioId: { not: null } },
  });

  const nonAdminUsers = await db.user.deleteMany({
    where: { role: { not: PLATFORM_ROLES.PLATFORM_ADMIN } },
  });

  // Detach any leftover activation code studio links, then delete studios
  await db.activationCode.updateMany({
    where: { usedByStudioId: { not: null } },
    data: {
      usedByStudioId: null,
      usedAt: null,
      activatedAt: null,
      usedByOwnerEmail: null,
      status: ACTIVATION_CODE_STATUSES.ACTIVE,
    },
  });

  const studios = await db.studio.deleteMany({});
  const platformAuditLogs = await db.platformAuditLog.deleteMany({});

  // Ensure platform admins are detached from any studio
  await db.user.updateMany({
    where: { role: PLATFORM_ROLES.PLATFORM_ADMIN },
    data: { studioId: null },
  });

  const remaining = {
    platformAdmins: await db.user.count({
      where: { role: PLATFORM_ROLES.PLATFORM_ADMIN },
    }),
    otherUsers: await db.user.count({
      where: { role: { not: PLATFORM_ROLES.PLATFORM_ADMIN } },
    }),
    studios: await db.studio.count(),
    invitations: await db.studioInvitation.count(),
    clients: await db.client.count(),
    bookings: await db.booking.count(),
    sessions: await db.session.count(),
    invoices: await db.invoice.count(),
    unusedActivationCodes: await db.activationCode.count({
      where: { status: ACTIVATION_CODE_STATUSES.ACTIVE, usedByStudioId: null },
    }),
    usedActivationCodes: await db.activationCode.count({
      where: {
        OR: [{ status: ACTIVATION_CODE_STATUSES.USED }, { usedByStudioId: { not: null } }],
      },
    }),
    permissions: await db.permission.count(),
    systemRoles: await db.roleDefinition.count({ where: { studioId: null } }),
  };

  if (remaining.platformAdmins < 1) {
    throw new Error("Reset failed integrity check: platform admin was removed");
  }
  if (remaining.otherUsers > 0 || remaining.studios > 0) {
    throw new Error(
      `Reset incomplete: otherUsers=${remaining.otherUsers} studios=${remaining.studios}`,
    );
  }

  process.stdout.write(
    [
      "Production commercial launch reset complete.",
      `  invoices removed: ${invoices.count}`,
      `  sessions removed: ${sessions.count}`,
      `  bookings removed: ${bookings.count}`,
      `  clients removed: ${clients.count}`,
      `  audit_logs removed: ${auditLogs.count}`,
      `  invitations removed: ${invitations.count}`,
      `  used activation codes removed: ${usedCodes.count}`,
      `  studio role definitions removed: ${studioRoles.count}`,
      `  non-admin users removed: ${nonAdminUsers.count}`,
      `  studios removed: ${studios.count}`,
      `  platform_audit_logs removed: ${platformAuditLogs.count}`,
      "",
      "Remaining:",
      `  platform_admins: ${remaining.platformAdmins}`,
      `  other_users: ${remaining.otherUsers}`,
      `  studios: ${remaining.studios}`,
      `  unused_activation_codes: ${remaining.unusedActivationCodes}`,
      `  used_activation_codes: ${remaining.usedActivationCodes}`,
      `  permissions: ${remaining.permissions}`,
      `  system_roles: ${remaining.systemRoles}`,
      "",
    ].join("\n"),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
