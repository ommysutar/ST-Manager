export interface StudioRoom {
  id: string;
  studioId: string;
  name: string;
  roomName: string | null;
  description: string;
  color: string;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
