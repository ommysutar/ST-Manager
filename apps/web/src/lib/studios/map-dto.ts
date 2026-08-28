import type {
  CreateStudioRoomDto,
  StudioRoomResponseDto,
  UpdateStudioRoomDto,
} from "@st-manager/contracts";

import type { StudioRoom } from "@/lib/studios/types";
import { DEFAULT_STUDIO_COLOR } from "@/lib/studios/types";

export function dtoToStudioRoom(dto: StudioRoomResponseDto): StudioRoom {
  const roomName = dto.roomName?.trim();
  return {
    id: dto.id,
    name: dto.name?.trim() || "Untitled Studio",
    roomName: roomName || undefined,
    description: dto.description?.trim() ?? "",
    color: dto.color?.trim() || DEFAULT_STUDIO_COLOR,
    active: dto.active ?? true,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function studioRoomToCreateDto(
  room: Omit<StudioRoom, "id" | "createdAt" | "updatedAt">,
): CreateStudioRoomDto {
  return {
    name: room.name,
    roomName: room.roomName ?? null,
    description: room.description,
    color: room.color,
    active: room.active,
  };
}

export function studioRoomPatchToUpdateDto(
  patch: Partial<Omit<StudioRoom, "id" | "createdAt">>,
): UpdateStudioRoomDto {
  const dto: UpdateStudioRoomDto = {};
  if (patch.name !== undefined) dto.name = patch.name;
  if (patch.roomName !== undefined) dto.roomName = patch.roomName ?? null;
  if (patch.description !== undefined) dto.description = patch.description;
  if (patch.color !== undefined) dto.color = patch.color;
  if (patch.active !== undefined) dto.active = patch.active;
  return dto;
}

export function studioRoomToResponseDto(room: StudioRoom, studioId: string): StudioRoomResponseDto {
  const now = new Date().toISOString();
  return {
    id: room.id,
    studioId,
    name: room.name,
    roomName: room.roomName ?? null,
    description: room.description,
    color: room.color,
    active: room.active,
    deletedAt: null,
    createdAt: room.createdAt ?? now,
    updatedAt: room.updatedAt ?? now,
  };
}
