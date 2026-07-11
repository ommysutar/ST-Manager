import type { ClientPortalSnapshotDto } from "@st-manager/contracts";

import type { ProjectBooking } from "@/lib/bookings/types";
import { getBookingSlotLabel } from "@/lib/bookings/slots";
import { listDocumentsForProject } from "@/lib/documents/storage";
import { PAYMENT_STATUS_LABELS, getPaymentStatus } from "@/lib/payments/status";
import type { StudioProfile } from "@/lib/profile/types";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/constants";
import { calculateProjectProgress } from "@/lib/projects/progress";
import type { StudioProject } from "@/lib/projects/types";
import type { StudioRoom } from "@/lib/studios/types";

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

export interface PortalEstimateInput {
  estimatedCompletionDate: string | null;
  scheduleStatus: "on_schedule" | "delayed" | "unknown";
  expectedCompletionDate: string | null;
  delayReason: string | null;
}

export interface BuildPortalSnapshotInput {
  project: StudioProject;
  profile: StudioProfile | null;
  bookings: ProjectBooking[];
  studios: StudioRoom[];
  studioMessage: string | null;
  estimate: PortalEstimateInput;
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
  const { project, profile, bookings, studios, studioMessage, estimate, serviceNames } = input;
  const progress = calculateProjectProgress(project);
  const paymentStatus = getPaymentStatus(project);
  const advancePaid = Math.max(0, project.grandTotal - project.remainingBalance);
  const now = Date.now();

  const upcomingBooking = bookings
    .filter((booking) => booking.status !== "cancelled")
    .find((booking) => new Date(`${booking.date}T23:59:59`).getTime() >= now);

  const studioName =
    upcomingBooking
      ? studios.find((room) => room.id === upcomingBooking.studioId)?.name ?? "Studio"
      : profile?.studioName || "Studio";

  const documents = listDocumentsForProject(project.id)
    .filter((doc) => doc.type === "quotation" || doc.type === "invoice")
    .map((doc) => {
      const snap = doc.snapshot;
      return {
        type: doc.type as "quotation" | "invoice",
        title: doc.type === "quotation" ? "Quotation" : "Invoice",
        number: doc.documentNumber,
        issuedAt: doc.createdAt,
        total: snap?.grandTotal ?? project.grandTotal,
        currency: "INR",
        lineItems: (snap?.lineItems ?? []).map((line) => ({
          label: line.name,
          amount: line.amount,
        })),
      };
    });

  return {
    projectName: project.projectName,
    clientName: project.clientName,
    service: (serviceNames && serviceNames.length > 0
      ? serviceNames.join(", ")
      : project.projectCategory) || "Studio Services",
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
    studioMessage,
    projectStatus: project.status,
  };
}

const PORTAL_URL_STORAGE_PREFIX = "st-manager-client-portal-url:";

export function savePortalUrl(projectId: string, portalUrl: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PORTAL_URL_STORAGE_PREFIX}${projectId}`, portalUrl);
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
