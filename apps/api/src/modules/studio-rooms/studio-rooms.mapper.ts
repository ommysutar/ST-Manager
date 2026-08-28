import type { StudioRoomResponseDto } from "@st-manager/contracts";
import type { StudioRoom } from "@st-manager/types";

export function toStudioRoomResponseDto(room: StudioRoom): StudioRoomResponseDto {
  return {
    id: room.id,
    studioId: room.studioId,
    name: room.name,
    roomName: room.roomName,
    description: room.description,
    color: room.color,
    active: room.active,
    deletedAt: room.deletedAt ? room.deletedAt.toISOString() : null,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}
