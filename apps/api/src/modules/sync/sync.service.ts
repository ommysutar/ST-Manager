import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type {
  SyncStudiosPullResponseDataDto,
  SyncStudiosPushResponseDataDto,
} from "@st-manager/contracts";
import type { SyncStudiosPullQueryInput, SyncStudiosPushInput } from "@st-manager/validation";

import { toStudioResponseDto } from "../studios/studios.mapper";
import { SyncRepository } from "./sync.repository";

@Injectable()
export class SyncService {
  constructor(private readonly syncRepository: SyncRepository) {}

  async pushStudios(input: SyncStudiosPushInput): Promise<SyncStudiosPushResponseDataDto> {
    const results = [];

    for (const studio of input.studios) {
      const status = await this.syncRepository.upsertStudio(studio);
      results.push({ id: studio.id, status });
    }

    return { results };
  }

  async pullStudios(query: SyncStudiosPullQueryInput): Promise<SyncStudiosPullResponseDataDto> {
    const since = query.since ? new Date(query.since) : undefined;
    const studios = await this.syncRepository.findUpdatedSince(since, SYNC.MAX_PULL_BATCH);

    return {
      studios: studios.map(toStudioResponseDto),
      serverTime: new Date().toISOString(),
    };
  }
}
