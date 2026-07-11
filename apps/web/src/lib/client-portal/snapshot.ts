import type { ClientPortalSnapshotDto } from "@st-manager/contracts";

import type { ProjectBooking } from "@/lib/bookings/types";
import { getBookingSlotLabel } from "@/lib/bookings/slots";
import { listDocumentsForProject } from "@/lib/documents/storage";
import { loadAllStudioServices } from "@/lib/inquiry/services";
import { PAYMENT_STATUS_LABELS, getPaymentStatus } from "@/lib/payments/status";
import type { StudioProfile } from "@/lib/profile/types";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/constants";
import { calculateProjectProgress } from "@/lib/projects/progress";
import type { StudioProject } from "@/lib/projects/types";
import type { StudioRoom } from "@/lib/studios/types";

import { loadPortalSettings, type PortalEstimateInput } from "./settings";

const TIMELINE_STEPS = [
  { key: "inquiry", label: "Inquiry", match: [/inquiry/i] },
  { key: "quotation", label: "Quotation Approved", match: [/quotation/i, /quote/i] },
  { key: "advance", label: "Advance Received", match: [/advance/i, /payment/i] },
  { key: "recording", label: "Recording", match: [/record/i] },
  { key: "editing", label: "Editing", match: [/edit/i] },
  { key: "mixing", label: "Mixing", match: [/mix/i] },
  { key: "mastering", label: "Mastering", match: [/master/i] },
  { key: "review", label: "Review", match: [/review/i] },
  { key: "completed", label: "Completed", match: [/deliver/i, /complete/i, /project_delivery/i] },
] as const;

export type { PortalEstimateInput };

export interface BuildPortalSnapshotInput {
  project: StudioProject;
  profile: StudioProfile | null;
  bookings: ProjectBooking[];
  studios: StudioRoom[];
  studioMessage?: string | null;
  estimate?: PortalEstimateInput;
  serviceNames?: string[];
}

function packageLabel(planId?: string): string {
  if (!planId) return "Custom";
  if (planId === "basic") return "Basic";
  if (planId === "standard") return "Standard";
  if (planId === "premium") return "Premium";
  return planId;
}

function buildTimeline(project: StudioProject) {
  const tasks = [...project.tasks].sort((a, b) => a.sortOrder - b.sortOrder);
  const progress = calculateProjectProgress(project);
  const isProjectComplete = project.status === "completed" || project.status === "delivered";

  return TIMELINE_STEPS.map((step, index) => {
    const matched = tasks.filter((task) =>
      step.match.some((regex) => regex.test(task.name) || (task.mandatoryKey ? regex.test(task.mandatoryKey) : false)),
    );
    const completed =
      isProjectComplete ||
      (matched.length > 0
        ? matched.every((task) => task.completed)
        : progress.percent >= Math.round(((index + 1) / TIMELINE_STEPS.length) * 100));

    return {
      key: step.key,
      label: step.label,
      completed,
      current: false,
    };
  }).map((step, index, all) => {
    const firstIncomplete = all.findIndex((entry) => !entry.completed);
    return {
      ...step,
      current: firstIncomplete === -1 ? index === all.length - 1 : index === firstIncomplete,
    };
  });
}

export function buildClientPortalSnapshot(input: BuildPortalSnapshotInput): ClientPortalSnapshotDto {
  const { project, profile, bookings, studios } = input;
  const settings = loadPortalSettings(project.id);
  const estimate = input.estimate ?? settings.estimate;
  const studioMessage =
    input.studioMessage !== undefined ? input.studioMessage : settings.studioMessage;
  const progress = calculateProjectProgress(project);
  const paymentStatus = getPaymentStatus(project);
  const advancePaid = Math.max(0, project.grandTotal - project.remainingBalance);
  const now = Date.now();

  const upcomingBooking = bookings
    .filter((booking) => booking.status !== "cancelled")
    .find((booking) => new Date(`${booking.date}T23:59:59`).getTime() >= now);

  const studioName = upcomingBooking
    ? (studios.find((room) => room.id === upcomingBooking.studioId)?.name ?? "Studio")
    : profile?.studioName || "Studio";

  const serviceNames =
    input.serviceNames ??
    loadAllStudioServices()
      .filter((service) => project.selectedServiceIds.includes(service.id))
      .map((service) => service.name);

  const documents = listDocumentsForProject(project.id)
    .filter((doc) => doc.type === "quotation" || doc.type === "invoice")
    .filter((doc) => Boolean(doc.documentNumber?.trim()))
    .map((doc) => {
      const snap = doc.snapshot;
      return {
        type: doc.type as "quotation" | "invoice",
        title: doc.type === "quotation" ? "Quotation" : "Invoice",
        number: doc.documentNumber,
        issuedAt: doc.createdAt,
        total: snap?.grandTotal ?? project.grandTotal,
        currency: "INR",
        lineItems: (snap?.lineItems ?? [])
          .filter((line) => Boolean(line.name?.trim()))
          .map((line) => ({
            label: line.name,
            amount: line.amount,
          })),
      };
    });

  const clientFiles = [
    ...project.files
      .filter((file) => Boolean(file.cloudUrl?.trim()))
      .map((file) => ({
        name: file.name || "Shared file",
        url: file.cloudUrl,
        kind: "file" as const,
      })),
    ...project.links
      .filter((link) => Boolean(link.url?.trim()))
      .map((link) => ({
        name: link.label || "Shared link",
        url: link.url,
        kind: "link" as const,
      })),
  ];

  return {
    projectName: project.projectName,
    clientName: project.clientName,
    service:
      (serviceNames.length > 0 ? serviceNames.join(", ") : project.projectCategory) || "Studio Services",
    packageName: packageLabel(project.planId),
    currentStatus: PROJECT_STATUS_LABELS[project.status] ?? project.status,
    progressPercent: progress.percent,
    studio: {
      name: profile?.studioName?.trim() || "Studio",
      logoDataUrl: profile?.logoDataUrl || "",
      address: profile?.address || "",
      phone: profile?.mobile || "",
      email: profile?.email || "",
    },
    estimate: {
      estimatedCompletionDate: estimate.estimatedCompletionDate,
      scheduleStatus: estimate.scheduleStatus,
      expectedCompletionDate: estimate.expectedCompletionDate,
      delayReason: estimate.delayReason,
    },
    timeline: buildTimeline(project),
    upcomingBooking: upcomingBooking
      ? {
          date: upcomingBooking.date,
          timeLabel: getBookingSlotLabel(upcomingBooking.slotId) || upcomingBooking.slotId,
          studioName,
        }
      : null,
    payment: {
      totalAmount: project.grandTotal,
      advancePaid,
      remainingAmount: Math.max(0, project.remainingBalance),
      status: PAYMENT_STATUS_LABELS[paymentStatus],
    },
    documents,
    clientFiles,
    clientNotes: project.notes.trim() || null,
    studioMessage: studioMessage?.trim() || null,
    projectStatus: project.status,
  };
}

const PORTAL_URL_STORAGE_PREFIX = "st-manager-client-portal-url:";
const PORTAL_LINKED_PREFIX = "st-manager-client-portal-linked:";

export function savePortalUrl(projectId: string, portalUrl: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PORTAL_URL_STORAGE_PREFIX}${projectId}`, portalUrl);
  localStorage.setItem(`${PORTAL_LINKED_PREFIX}${projectId}`, "1");
}

export function markPortalLinked(projectId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PORTAL_LINKED_PREFIX}${projectId}`, "1");
}

export function isPortalLinked(projectId: string): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(`${PORTAL_LINKED_PREFIX}${projectId}`) === "1" ||
    Boolean(localStorage.getItem(`${PORTAL_URL_STORAGE_PREFIX}${projectId}`))
  );
}

export function listLinkedPortalProjectIds(): string[] {
  if (typeof window === "undefined") return [];
  const ids = new Set<string>();
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(PORTAL_LINKED_PREFIX)) {
      ids.add(key.slice(PORTAL_LINKED_PREFIX.length));
    } else if (key.startsWith(PORTAL_URL_STORAGE_PREFIX)) {
      ids.add(key.slice(PORTAL_URL_STORAGE_PREFIX.length));
    }
  }
  return [...ids];
}

export function loadPortalUrl(projectId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${PORTAL_URL_STORAGE_PREFIX}${projectId}`);
}

export function clearPortalUrl(projectId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PORTAL_URL_STORAGE_PREFIX}${projectId}`);
}

export function buildPortalWhatsAppMessage(input: {
  clientName: string;
  studioName: string;
  portalUrl: string;
}): string {
  return [
    `Hello ${input.clientName},`,
    "",
    "Your project progress can be viewed securely here:",
    "",
    input.portalUrl,
    "",
    "Regards,",
    input.studioName,
  ].join("\n");
}
