import type { ProjectPlan, StudioService } from "./types";

export const DEFAULT_PROJECT_PLANS: ProjectPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 5000,
    active: true,
    features: [
      "Up to 4 hours studio time",
      "Basic recording setup",
      "1 revision round",
      "MP3 delivery",
      "Email support",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: 25000,
    highlighted: true,
    active: true,
    features: [
      "Up to 12 hours studio time",
      "Multi-track recording",
      "Mixing included",
      "3 revision rounds",
      "WAV + MP3 delivery",
      "Priority scheduling",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 120000,
    active: true,
    features: [
      "Unlimited studio hours (project scope)",
      "Full production suite",
      "Mixing & mastering",
      "Unlimited revisions",
      "All format delivery",
      "Dedicated engineer",
      "Video shoot add-on ready",
    ],
  },
];

export const DEFAULT_STUDIO_SERVICES: StudioService[] = [
  {
    id: "recording",
    name: "Recording",
    price: 5000,
    category: "Audio",
    description: "Studio recording session",
    active: true,
  },
  {
    id: "mixing",
    name: "Mixing",
    price: 3000,
    category: "Audio",
    description: "Track mixing and balance",
    active: true,
  },
  {
    id: "mastering",
    name: "Mastering",
    price: 2000,
    category: "Audio",
    description: "Final master delivery",
    active: true,
  },
  {
    id: "programming",
    name: "Programming",
    price: 4000,
    category: "Production",
    description: "Beat and arrangement programming",
    active: true,
  },
  {
    id: "editing",
    name: "Editing",
    price: 2500,
    category: "Post-Production",
    description: "Audio editing and cleanup",
    active: true,
  },
  {
    id: "vocal-tuning",
    name: "Vocal Tuning",
    price: 3500,
    category: "Post-Production",
    description: "Pitch correction and tuning",
    active: true,
  },
  {
    id: "live-recording",
    name: "Live Recording",
    price: 8000,
    category: "Live",
    description: "On-location live recording",
    active: true,
  },
  {
    id: "video-shoot",
    name: "Video Shoot",
    price: 15000,
    category: "Video",
    description: "Studio or location video shoot",
    active: true,
  },
  {
    id: "video-editing",
    name: "Video Editing",
    price: 10000,
    category: "Video",
    description: "Video post-production editing",
    active: true,
  },
];

export const STUDIO_DISCOUNT_OPTIONS = [0, 5, 10, 15, 20] as const;
export const ADVANCE_PERCENT_OPTIONS = [10, 20, 30, 50] as const;

export const PROJECT_CATEGORIES = [
  "Music Production",
  "Podcast",
  "Voice Over",
  "Film Scoring",
  "Live Event",
  "Corporate",
  "Other",
] as const;

export const WIZARD_STEPS = [
  { id: 1, label: "Client Details", shortLabel: "Client" },
  { id: 2, label: "Project Details", shortLabel: "Project" },
  { id: 3, label: "Plan Selection", shortLabel: "Plan" },
  { id: 4, label: "Services", shortLabel: "Services" },
  { id: 5, label: "Decision", shortLabel: "Decision" },
  { id: 6, label: "Advance Payment", shortLabel: "Payment" },
] as const;
