import type { StudioRoom } from "./types";

export const DEFAULT_STUDIOS: StudioRoom[] = [
  {
    id: "studio_a",
    name: "Studio A",
    description: "Main recording studio",
    color: "#6366f1",
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "studio_b",
    name: "Studio B",
    description: "Secondary recording room",
    color: "#0ea5e9",
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "recording_room",
    name: "Recording Room",
    description: "Vocal and instrument recording",
    color: "#22c55e",
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "podcast_room",
    name: "Podcast Room",
    description: "Podcast and voice-over sessions",
    color: "#f59e0b",
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "mix_room",
    name: "Mix Room",
    description: "Mixing and mastering suite",
    color: "#ec4899",
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];
