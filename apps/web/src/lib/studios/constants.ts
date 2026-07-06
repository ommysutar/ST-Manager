import type { StudioRoom } from "./types";

export const DEFAULT_STUDIOS: StudioRoom[] = [
  {
    id: "studio_a",
    name: "Studio A",
    description: "Main recording studio",
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "studio_b",
    name: "Studio B",
    description: "Secondary recording room",
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "recording_room",
    name: "Recording Room",
    description: "Vocal and instrument recording",
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "podcast_room",
    name: "Podcast Room",
    description: "Podcast and voice-over sessions",
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "mix_room",
    name: "Mix Room",
    description: "Mixing and mastering suite",
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];
