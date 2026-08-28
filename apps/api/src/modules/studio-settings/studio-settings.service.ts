import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PLATFORM_ROLES, SYNC } from "@st-manager/constants";
import type { StudioSettings } from "@st-manager/types";
import type {
  SyncStudioSettingsPullQueryInput,
  UpdateStudioSettingsInput,
} from "@st-manager/validation";

import { AuthRepository } from "../auth/auth.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import { StudioSettingsRepository } from "./studio-settings.repository";

@Injectable()
export class StudioSettingsService {
  constructor(
    private readonly studioSettingsRepository: StudioSettingsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async getOrCreate(actor: AuthenticatedUser): Promise<StudioSettings> {
    const studioId = await this.requireStudioId(actor);
    return this.studioSettingsRepository.findOrCreate(studioId);
  }

  async upsert(actor: AuthenticatedUser, input: UpdateStudioSettingsInput): Promise<StudioSettings> {
    const studioId = await this.requireStudioId(actor);
    const updateData: Parameters<StudioSettingsRepository["upsert"]>[1] = {};
    if (input.profile !== undefined) updateData.profile = input.profile;
    if (input.whatsapp !== undefined) updateData.whatsapp = input.whatsapp;
    return this.studioSettingsRepository.upsert(studioId, updateData);
  }

  async pullChanges(
    actor: AuthenticatedUser,
    query: SyncStudioSettingsPullQueryInput,
  ): Promise<{ data: StudioSettings[]; serverTime: string; hasMore: boolean }> {
    const studioId = await this.requireStudioId(actor);
    const serverNow = new Date();
    let since = query.since ? new Date(query.since) : undefined;
    if (since && Number.isNaN(since.getTime())) {
      since = undefined;
    }
    if (since && since.getTime() > serverNow.getTime()) {
      since = undefined;
    }

    const take = SYNC.MAX_STUDIO_SETTINGS_PULL_BATCH;
    const rows = await this.studioSettingsRepository.findChangesSince({
      studioId,
      since,
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const lastUpdatedAt = page.at(-1)?.updatedAt;
    const serverTime = lastUpdatedAt
      ? lastUpdatedAt.toISOString()
      : since && since.getTime() <= serverNow.getTime()
        ? since.toISOString()
        : serverNow.toISOString();

    return { data: page, serverTime, hasMore };
  }

  async requireStudioId(actor: AuthenticatedUser): Promise<string> {
    if (actor.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new ForbiddenException("Platform admin cannot access studio settings");
    }

    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }
}
