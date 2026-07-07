export type WhatsAppNotificationType =
  | "inquiry_received"
  | "quotation_ready"
  | "booking_confirmed"
  | "recording_started"
  | "editing_started"
  | "mixing_started"
  | "mastering_started"
  | "project_ready"
  | "payment_reminder"
  | "payment_received"
  | "invoice_ready"
  | "files_shared"
  | "project_delivered";

export interface WhatsAppTemplate {
  id: WhatsAppNotificationType;
  label: string;
  body: string;
  enabled: boolean;
}

export interface WhatsAppSettings {
  templates: WhatsAppTemplate[];
  updatedAt: string;
}

export interface WhatsAppMessageVariables {
  ClientName?: string;
  ProjectName?: string;
  ProjectID?: string;
  StudioName?: string;
  ProjectStatus?: string;
  BookingDate?: string;
  InvoiceNumber?: string;
  QuotationNumber?: string;
  PaymentAmount?: string;
  BalanceAmount?: string;
  GoogleDriveLink?: string;
}

export const WHATSAPP_STORAGE_KEY = "st-manager-whatsapp-settings";

export const WHATSAPP_PLACEHOLDER_LABELS: Record<keyof WhatsAppMessageVariables, string> = {
  ClientName: "{{ClientName}}",
  ProjectName: "{{ProjectName}}",
  ProjectID: "{{ProjectID}}",
  StudioName: "{{StudioName}}",
  ProjectStatus: "{{ProjectStatus}}",
  BookingDate: "{{BookingDate}}",
  InvoiceNumber: "{{InvoiceNumber}}",
  QuotationNumber: "{{QuotationNumber}}",
  PaymentAmount: "{{PaymentAmount}}",
  BalanceAmount: "{{BalanceAmount}}",
  GoogleDriveLink: "{{GoogleDriveLink}}",
};
