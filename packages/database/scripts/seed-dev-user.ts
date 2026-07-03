import bcrypt from "bcrypt";
import "dotenv/config";

import { createSqlitePrismaClient, getPrisma } from "../src/index";

const DEV_EMAIL = "dev@st-manager.local";
const DEV_PASSWORD = "devpassword";

async function main(): Promise<void> {
  const usePostgres =
    process.env["NODE_ENV"] === "production" && Boolean(process.env["DATABASE_URL"]);
  const client = usePostgres ? getPrisma() : createSqlitePrismaClient();
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  await client.user.upsert({
    where: { email: DEV_EMAIL },
    update: { passwordHash, role: "owner" },
    create: {
      email: DEV_EMAIL,
      passwordHash,
      role: "owner",
    },
  });

  process.stdout.write(
    `Seeded dev user ${DEV_EMAIL} (password: ${DEV_PASSWORD}, role: owner)\n`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
