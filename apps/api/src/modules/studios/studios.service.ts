import { Injectable } from "@nestjs/common";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { Studio } from "@st-manager/types";
import type { CreateStudioInput, ListStudiosQueryInput } from "@st-manager/validation";

import { StudiosRepository } from "./studios.repository";

/**
 * Business/orchestration logic only — no HTTP concerns (no status codes, no
 * DTOs) and no direct Prisma access (always via `StudiosRepository`, per the
 * Controller -> Service -> Repository -> Prisma layering).
 *
 * Takes the Zod-inferred `CreateStudioInput`/`ListStudiosQueryInput` types
 * (from `@st-manager/validation`), not the wire-level `CreateStudioDto`/
 * `ListStudiosQueryDto` (from `@st-manager/contracts`) — the former
 * guarantees `page`/`pageSize` are always resolved (Zod's `.default()`
 * already applied by `ZodValidationPipe`), so no `?? fallback` logic is
 * needed here.
 */
@Injectable()
export class StudiosService {
  constructor(private readonly studiosRepository: StudiosRepository) {}

  async create(input: CreateStudioInput): Promise<Studio> {
    return this.studiosRepository.create({ name: input.name });
  }

  async list(query: ListStudiosQueryInput): Promise<{ data: Studio[]; meta: PaginationMetaDto }> {
    const { page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.studiosRepository.findMany({ skip, take: pageSize }),
      this.studiosRepository.count(),
    ]);

    return { data, meta: { page, pageSize, total } };
  }
}
