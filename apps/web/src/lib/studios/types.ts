export interface StudioRoom {
  id: string;
  /** Primary studio label (e.g. Studio A, Mix Room). */
  name: string;
  /** Optional room identifier within the studio (e.g. Booth 1). */
  roomName?: string;
  description: string;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const STUDIOS_STORAGE_KEY = "st-manager-studios";

export const DEFAULT_STUDIO_COLOR = "#6366f1";
