export interface CreateStudioRoomDto {
  name: string;
  roomName?: string | null;
  description?: string;
  color?: string;
  active?: boolean;
}
