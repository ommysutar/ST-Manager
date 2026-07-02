import type { StudioResponseDto } from "@st-manager/contracts";
import type { Studio } from "@st-manager/types";

/**
 * Dedicated mapper (M5 decision: "use dedicated mappers for DTO conversion")
 * — the single place `Studio` (domain shape, `Date` fields) becomes
 * `StudioResponseDto` (wire shape, ISO 8601 string fields). Only
 * `StudiosController` calls this; `StudiosService`/`StudiosRepository` never
 * see `StudioResponseDto`.
 */
export function toStudioResponseDto(studio: Studio): StudioResponseDto {
  return {
    id: studio.id,
    name: studio.name,
    createdAt: studio.createdAt.toISOString(),
    updatedAt: studio.updatedAt.toISOString(),
  };
}
