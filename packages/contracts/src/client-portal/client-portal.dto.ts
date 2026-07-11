export interface ClientPortalStudioDto {
  name: string;
  logoDataUrl: string;
  address: string;
  phone: string;
  email: string;
}

export interface ClientPortalTimelineStepDto {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
}

export interface ClientPortalBookingDto {
  date: string;
  timeLabel: string;
  studioName: string;
}

export interface ClientPortalPaymentDto {
  totalAmount: number;
  advancePaid: number;
  remainingAmount: number;
  status: string;
}

export interface ClientPortalDocumentDto {
  type: "quotation" | "invoice";
  title: string;
  number: string;
  issuedAt: string | null;
  total: number;
  currency: string;
  lineItems: Array<{ label: string; amount: number }>;
}

export interface ClientPortalEstimateDto {
  estimatedCompletionDate: string | null;
  scheduleStatus: "on_schedule" | "delayed" | "unknown";
  expectedCompletionDate: string | null;
  delayReason: string | null;
}

export interface ClientPortalSnapshotDto {
  projectName: string;
  clientName: string;
  service: string;
  packageName: string;
  currentStatus: string;
  progressPercent: number;
  studio: ClientPortalStudioDto;
  estimate: ClientPortalEstimateDto;
  timeline: ClientPortalTimelineStepDto[];
  upcomingBooking: ClientPortalBookingDto | null;
  payment: ClientPortalPaymentDto;
  documents: ClientPortalDocumentDto[];
  studioMessage: string | null;
  projectStatus: string;
}

export interface ClientPortalLinkMetaDto {
  status: "active" | "disabled" | "expired" | "missing";
  createdAt: string | null;
  expiresAt: string | null;
  hasLink: boolean;
  portalUrl: string | null;
  studioMessage: string | null;
}

export interface ClientPortalCreateOrSyncRequestDto {
  snapshot: ClientPortalSnapshotDto;
  studioMessage?: string | null;
}

export interface ClientPortalCreateResponseDto {
  success: true;
  data: {
    meta: ClientPortalLinkMetaDto;
    token: string;
    portalUrl: string;
  };
}

export interface ClientPortalMetaResponseDto {
  success: true;
  data: ClientPortalLinkMetaDto;
}

export interface ClientPortalAccessResponseDto {
  success: true;
  data: {
    status: "active" | "disabled" | "expired";
    expiresAt: string | null;
    snapshot: ClientPortalSnapshotDto;
  };
}

export interface ClientPortalEmailRequestDto {
  to?: string;
  portalUrl: string;
}
