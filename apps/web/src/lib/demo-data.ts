import type { BookingSlot } from "@/lib/bookings/types";
import type { StudioService } from "@/lib/inquiry/types";
import type { StudioRoom } from "@/lib/studios/types";

import { ENABLE_DEMO_DATA } from "./app-config";

const DEMO_STUDIOS: StudioRoom[] = [
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

const DEMO_BOOKING_SLOTS: BookingSlot[] = [
  {
    id: "slot_1",
    label: "11:00 AM – 2:00 PM",
    startHour: 11,
    startMinute: 0,
    endHour: 14,
    endMinute: 0,
    isCustom: false,
    sortOrder: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "slot_2",
    label: "3:00 PM – 6:00 PM",
    startHour: 15,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
    isCustom: false,
    sortOrder: 1,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "slot_3",
    label: "7:00 PM – 9:00 PM",
    startHour: 19,
    startMinute: 0,
    endHour: 21,
    endMinute: 0,
    isCustom: false,
    sortOrder: 2,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

const DEMO_STUDIO_SERVICES: StudioService[] = [
  {
    id: "recording",
    name: "Recording",
    price: 5000,
    prices: { basic: 4000, standard: 5000, premium: 7000 },
    category: "Audio",
    description: "Studio recording session",
    active: true,
    mandatory: false,
  },
  {
    id: "mixing",
    name: "Mixing",
    price: 3000,
    prices: { basic: 2400, standard: 3000, premium: 4500 },
    category: "Audio",
    description: "Track mixing and balance",
    active: true,
    mandatory: false,
  },
  {
    id: "mastering",
    name: "Mastering",
    price: 2000,
    prices: { basic: 1600, standard: 2000, premium: 3000 },
    category: "Audio",
    description: "Final master delivery",
    active: true,
    mandatory: false,
  },
  {
    id: "programming",
    name: "Programming",
    price: 4000,
    prices: { basic: 3200, standard: 4000, premium: 5500 },
    category: "Production",
    description: "Beat and arrangement programming",
    active: true,
    mandatory: false,
  },
  {
    id: "editing",
    name: "Editing",
    price: 2500,
    prices: { basic: 2000, standard: 2500, premium: 3500 },
    category: "Post-Production",
    description: "Audio editing and cleanup",
    active: true,
    mandatory: false,
  },
  {
    id: "vocal-tuning",
    name: "Vocal Tuning",
    price: 3500,
    prices: { basic: 2800, standard: 3500, premium: 5000 },
    category: "Post-Production",
    description: "Pitch correction and tuning",
    active: true,
    mandatory: false,
  },
  {
    id: "live-recording",
    name: "Live Recording",
    price: 8000,
    prices: { basic: 6400, standard: 8000, premium: 10000 },
    category: "Live",
    description: "On-location live recording",
    active: true,
    mandatory: false,
  },
  {
    id: "video-shoot",
    name: "Video Shoot",
    price: 15000,
    prices: { basic: 12000, standard: 15000, premium: 20000 },
    category: "Video",
    description: "Studio or location video shoot",
    active: true,
    mandatory: false,
  },
  {
    id: "video-editing",
    name: "Video Editing",
    price: 10000,
    prices: { basic: 8000, standard: 10000, premium: 14000 },
    category: "Video",
    description: "Video post-production editing",
    active: true,
    mandatory: false,
  },
  {
    id: "studio_rent",
    name: "Studio Rent",
    price: 1500,
    prices: { basic: 1200, standard: 1500, premium: 2000 },
    category: "Studio",
    description: "Hourly studio rental",
    active: true,
    mandatory: false,
    isStudioRent: true,
  },
];

export function getDefaultStudios(): StudioRoom[] {
  return ENABLE_DEMO_DATA ? DEMO_STUDIOS : [];
}

export function getDefaultBookingSlots(): BookingSlot[] {
  return ENABLE_DEMO_DATA ? DEMO_BOOKING_SLOTS : [];
}

export function getDefaultStudioServices(): StudioService[] {
  return ENABLE_DEMO_DATA ? DEMO_STUDIO_SERVICES : [];
}
