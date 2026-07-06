import bcrypt from "bcrypt";
import "dotenv/config";

import { createSqlitePrismaClient, getPrisma } from "../src/index";

const DEV_PASSWORD = "devpassword";

const DEV_USERS = [
  { email: "owner@st-manager.local", role: "owner" },
  { email: "assistant@st-manager.local", role: "assistant" },
  { email: "engineer@st-manager.local", role: "engineer" },
  { email: "dev@st-manager.local", role: "owner" },
] as const;

async function main(): Promise<void> {
  const usePostgres =
    process.env["NODE_ENV"] === "production" && Boolean(process.env["DATABASE_URL"]);
  const client = usePostgres ? getPrisma() : createSqlitePrismaClient();
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  for (const user of DEV_USERS) {
    await client.user.upsert({
      where: { email: user.email },
      update: { passwordHash, role: user.role },
      create: {
        email: user.email,
        passwordHash,
        role: user.role,
      },
    });
  }

  process.stdout.write(
    `Seeded dev users (password: ${DEV_PASSWORD}) — owner, assistant, engineer\n`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
