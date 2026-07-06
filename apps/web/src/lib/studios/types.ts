export interface StudioRoom {
  id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const STUDIOS_STORAGE_KEY = "st-manager-studios";

export const DEFAULT_STUDIO_COLOR = "#6366f1";
