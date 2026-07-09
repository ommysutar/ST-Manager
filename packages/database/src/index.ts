export { getPrisma } from "./client";
export type { Studio } from "./generated/postgresql/client";
export type { PrismaClient as PostgresPrismaClient } from "./generated/postgresql/client";
export { Prisma } from "./generated/postgresql/client";

export { createSqlitePrismaClient } from "./sqlite";
export type { SqlitePrismaClient } from "./sqlite";
