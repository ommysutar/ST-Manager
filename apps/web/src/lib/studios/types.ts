export interface StudioRoom {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const STUDIOS_STORAGE_KEY = "st-manager-studios";
