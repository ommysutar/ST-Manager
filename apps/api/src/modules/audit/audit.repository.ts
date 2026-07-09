import { Injectable } from "@nestjs/common";
import type { PostgresPrismaClient } from "@st-manager/database";
import { Prisma } from "@st-manager/database";
import { AUDIT_ACTIONS } from "@st-manager/constants";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

export interface CreateAuditLogInput {
  studioId: string;
  actorUserId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(input: CreateAuditLogInput): Promise<void> {
    const client = asClient(this.prismaService.getClient());
    await client.auditLog.create({
      data: {
        studioId: input.studioId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}

export { AUDIT_ACTIONS };
