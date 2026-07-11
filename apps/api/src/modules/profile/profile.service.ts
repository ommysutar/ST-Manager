import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TEAM_ROLES } from "@st-manager/constants";
import type { StudioUserProfileDto } from "@st-manager/contracts";
import type { UpdateStudioUserProfileInput } from "@st-manager/validation";
import type { PostgresPrismaClient } from "@st-manager/database";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";

function asClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

@Injectable()
export class ProfileService {
  constructor(private readonly prismaService: PrismaService) {}

  async getProfile(actor: AuthenticatedUser): Promise<StudioUserProfileDto> {
    return this.loadProfileDto(actor.userId);
  }

  async updateProfile(
    actor: AuthenticatedUser,
    input: UpdateStudioUserProfileInput,
  ): Promise<StudioUserProfileDto> {
    const client = asClient(this.prismaService.getClient());
    const user = await client.user.findUnique({
      where: { id: actor.userId },
      include: { studio: { select: { id: true, name: true } } },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (input.studioName !== undefined && user.role !== TEAM_ROLES.OWNER) {
      throw new ForbiddenException("Only the studio owner can update the studio name");
    }

    if (input.studioName !== undefined && !user.studioId) {
      throw new BadRequestException("User is not linked to a studio");
    }

    await client.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
        },
      });

      if (input.studioName !== undefined && user.studioId) {
        await tx.studio.update({
          where: { id: user.studioId },
          data: { name: input.studioName },
        });
      }
    });

    return this.loadProfileDto(actor.userId);
  }

  private async loadProfileDto(userId: string): Promise<StudioUserProfileDto> {
    const client = asClient(this.prismaService.getClient());
    const user = await client.user.findUnique({
      where: { id: userId },
      include: { studio: { select: { id: true, name: true } } },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      studioId: user.studioId,
      studioName: user.studio?.name ?? null,
    };
  }
}
