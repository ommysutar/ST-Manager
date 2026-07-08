/**
 * Production reset — removes all operational API data for first studio launch.
 * Keeps: User accounts (owner login). Removes: clients, bookings, sessions, invoices, API studios.
 *
 * Usage: pnpm --filter @st-manager/database exec tsx scripts/production-reset.ts
 */
import "dotenv/config";

import { createSqlitePrismaClient, getPrisma } from "../src/index";

async function main(): Promise<void> {
  const usePostgres =
    process.env["NODE_ENV"] === "production" && Boolean(process.env["DATABASE_URL"]);
  const db = usePostgres ? getPrisma() : createSqlitePrismaClient();

  const invoices = await db.invoice.deleteMany({});
  const sessions = await db.session.deleteMany({});
  const bookings = await db.booking.deleteMany({});
  const clients = await db.client.deleteMany({});
  const studios = await db.studio.deleteMany({});

  const users = await db.user.count();

  process.stdout.write(
    [
      "Production API reset complete.",
      `  invoices removed: ${invoices.count}`,
      `  sessions removed: ${sessions.count}`,
      `  bookings removed: ${bookings.count}`,
      `  clients removed: ${clients.count}`,
      `  API studios removed: ${studios.count}`,
      `  users kept: ${users}`,
      "",
    ].join("\n"),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
