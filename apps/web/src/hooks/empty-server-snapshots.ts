import type { ProjectBooking, BookingSlot } from "@/lib/bookings/types";
import type { ClientResponseDto } from "@st-manager/contracts";
import type { StudioDocument } from "@/lib/documents/types";
import type { SavedInquiry, StudioService } from "@/lib/inquiry/types";
import type { PaymentRecord } from "@/lib/payments/types";
import type { StudioProject } from "@/lib/projects/types";
import type { StudioRoom } from "@/lib/studios/types";

import type { WhatsAppSettings } from "@/lib/whatsapp/types";
import { createDefaultWhatsAppSettings } from "@/lib/whatsapp/constants";

/** Stable empty snapshots for useSyncExternalStore getServerSnapshot — must not allocate per call. */
export const EMPTY_CLIENTS: ClientResponseDto[] = [];
export const EMPTY_STUDIOS: StudioRoom[] = [];
export const EMPTY_BOOKING_SLOTS: BookingSlot[] = [];
export const EMPTY_BOOKINGS: ProjectBooking[] = [];
export const EMPTY_PROJECTS: StudioProject[] = [];
export const EMPTY_INQUIRIES: SavedInquiry[] = [];
export const EMPTY_STUDIO_SERVICES: StudioService[] = [];
export const EMPTY_PAYMENTS: PaymentRecord[] = [];
export const EMPTY_DOCUMENTS: StudioDocument[] = [];
export const EMPTY_WHATSAPP_SETTINGS: WhatsAppSettings = createDefaultWhatsAppSettings();
