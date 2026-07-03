import { Injectable } from "@nestjs/common";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { Studio } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

/**
 * `PrismaService.getClient()` returns `DatabaseClient` (`PostgresPrismaClient
 * | SqlitePrismaClient`) — two independently-generated Prisma Client
 * classes, not one client parameterized by provider. TypeScript cannot
 * resolve overloaded generic methods (`findMany`, `count`) called directly
 * on that union (`TS2349: this expression is not callable`), even though
 * both clients' `Studio` delegate is structurally identical for this
 * model (same fields, same query shape — the schemas differ only in a
 * PostgreSQL-only `@db.VarChar(120)` attribute that isn't reflected in the
 * generated TS types at all).
 *
 * This narrow, single-purpose cast is the contingency the M5 planning
 * report reserved for exactly this situation: treat the client as the
 * PostgreSQL-generated shape at the one place `.studio` is accessed, rather
 * than letting the union type leak into every method below. If the two
 * schemas ever diverge in a way that changes the `Studio` delegate's shape,
 * this is the only line that needs to change.
 */
function asStudioClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

/**
 * The only file in `apps/api` that calls `PrismaService.getClient()` for the
 * Studio resource (M5 decision: "never access Prisma outside the Repository
 * layer") — `StudiosService`/`StudiosController` never import `PrismaService`
 * or `@st-manager/database` directly.
 *
 * Returns/accepts `Studio` from `@st-manager/types` (the domain shape), never
 * a DTO and never either generated Prisma client's own `Studio` type — both
 * generated clients' query results are structurally identical to
 * `@st-manager/types`' `Studio`, so this is a zero-cost type annotation.
 *
 * `create`'s input is `{ name: string }` only — there is no `id` field to
 * accept, so a caller cannot supply one even if it tried (M5 decision: "keep
 * database-generated IDs only" — every `Studio.id` comes from Prisma's
 * `@default(cuid())`, never from client input).
 */
@Injectable()
export class StudiosRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: { name: string }): Promise<Studio> {
    const client = asStudioClient(this.prismaService.getClient());
    return client.studio.create({ data });
  }

  async findMany(params: { skip: number; take: number }): Promise<Studio[]> {
    const client = asStudioClient(this.prismaService.getClient());
    return client.studio.findMany({
      skip: params.skip,
      take: params.take,
      // Mandatory, not cosmetic: Prisma does not guarantee row order
      // without an explicit `orderBy`, and a paginated list needs a stable
      // order for `page=1`/`page=2` to be meaningful.
      orderBy: { createdAt: "desc" },
    });
  }

  async count(): Promise<number> {
    const client = asStudioClient(this.prismaService.getClient());
    return client.studio.count();
  }

  async findById(id: string): Promise<Studio | null> {
    const client = asStudioClient(this.prismaService.getClient());
    return client.studio.findUnique({ where: { id } });
  }
}
