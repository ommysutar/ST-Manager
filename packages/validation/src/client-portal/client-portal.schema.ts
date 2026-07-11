import { z } from "zod";

const timelineStepSchema = z.object({
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
  completed: z.boolean(),
  current: z.boolean(),
});

const documentSchema = z.object({
  type: z.enum(["quotation", "invoice"]),
  title: z.string().trim().min(1).max(120),
  number: z.string().trim().min(1).max(64),
  issuedAt: z.string().trim().nullable(),
  total: z.number(),
  currency: z.string().trim().min(1).max(8).default("INR"),
  lineItems: z.array(
    z.object({
      label: z.string().trim().min(1).max(200),
      amount: z.number(),
    }),
  ),
});

export const clientPortalSnapshotSchema = z.object({
  projectName: z.string().trim().min(1).max(200),
  clientName: z.string().trim().min(1).max(200),
  service: z.string().trim().max(200).default(""),
  packageName: z.string().trim().max(200).default(""),
  currentStatus: z.string().trim().min(1).max(64),
  progressPercent: z.number().min(0).max(100),
  studio: z.object({
    name: z.string().trim().min(1).max(200),
    logoDataUrl: z.string().max(5_000_000).default(""),
    address: z.string().trim().max(1000).default(""),
    phone: z.string().trim().max(64).default(""),
    email: z.string().trim().max(255).default(""),
  }),
  estimate: z.object({
    estimatedCompletionDate: z.string().trim().nullable(),
    scheduleStatus: z.enum(["on_schedule", "delayed", "unknown"]),
    expectedCompletionDate: z.string().trim().nullable(),
    delayReason: z.string().trim().max(1000).nullable(),
  }),
  timeline: z.array(timelineStepSchema).max(20),
  upcomingBooking: z
    .object({
      date: z.string().trim().min(1).max(32),
      timeLabel: z.string().trim().min(1).max(120),
      studioName: z.string().trim().min(1).max(200),
    })
    .nullable(),
  payment: z.object({
    totalAmount: z.number(),
    advancePaid: z.number(),
    remainingAmount: z.number(),
    status: z.string().trim().min(1).max(64),
  }),
  documents: z.array(documentSchema).max(10),
  clientFiles: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        url: z.string().trim().min(1).max(2000),
        kind: z.enum(["file", "link"]),
      }),
    )
    .max(50)
    .default([]),
  clientNotes: z.string().trim().max(5000).nullable().default(null),
  studioMessage: z.string().trim().max(2000).nullable(),
  projectStatus: z.string().trim().min(1).max(64),
});

export const clientPortalCreateOrSyncSchema = z.object({
  snapshot: clientPortalSnapshotSchema,
  studioMessage: z.string().trim().max(2000).optional().nullable(),
});

export const clientPortalEmailSchema = z.object({
  to: z.string().trim().email().optional(),
  portalUrl: z.string().trim().url(),
});

export type ClientPortalSnapshotInput = z.infer<typeof clientPortalSnapshotSchema>;
export type ClientPortalCreateOrSyncInput = z.infer<typeof clientPortalCreateOrSyncSchema>;
export type ClientPortalEmailInput = z.infer<typeof clientPortalEmailSchema>;
