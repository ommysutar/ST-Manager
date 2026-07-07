import type { WhatsAppNotificationType, WhatsAppSettings, WhatsAppTemplate } from "./types";

export const WHATSAPP_NOTIFICATION_LABELS: Record<WhatsAppNotificationType, string> = {
  inquiry_received: "Inquiry Received",
  quotation_ready: "Quotation Ready",
  booking_confirmed: "Booking Confirmed",
  recording_started: "Recording Started",
  editing_started: "Editing Started",
  mixing_started: "Mixing Started",
  mastering_started: "Mastering Started",
  project_ready: "Project Ready",
  payment_reminder: "Payment Reminder",
  payment_received: "Payment Received",
  invoice_ready: "Invoice Ready",
  files_shared: "Files Shared",
  project_delivered: "Project Delivered",
};

const DEFAULT_TEMPLATE_BODIES: Record<WhatsAppNotificationType, string> = {
  inquiry_received: `Hello {{ClientName}},

Thank you for your inquiry for "{{ProjectName}}".

We have received your details and will get back to you shortly.

{{StudioName}}`,
  quotation_ready: `Hello {{ClientName}},

Your quotation for "{{ProjectName}}" ({{QuotationNumber}}) is ready.

Please review and let us know if you have any questions.

{{StudioName}}`,
  booking_confirmed: `Hello {{ClientName}},

Your booking for "{{ProjectName}}" on {{BookingDate}} is confirmed.

We look forward to seeing you!

{{StudioName}}`,
  recording_started: `Hello {{ClientName}},

Recording has started for your project "{{ProjectName}}".

{{StudioName}}`,
  editing_started: `Hello {{ClientName}},

Your project "{{ProjectName}}" has entered the Editing stage.

{{StudioName}}`,
  mixing_started: `Hello {{ClientName}},

Your project "{{ProjectName}}" has entered the Mixing stage.

Thank you.

{{StudioName}}`,
  mastering_started: `Hello {{ClientName}},

Your project "{{ProjectName}}" has entered the Mastering stage.

{{StudioName}}`,
  project_ready: `Hello {{ClientName}},

Great news! Your project "{{ProjectName}}" is ready.

{{StudioName}}`,
  payment_reminder: `Hello {{ClientName}},

This is a friendly reminder regarding the pending balance of {{BalanceAmount}} for "{{ProjectName}}".

{{StudioName}}`,
  payment_received: `Hello {{ClientName}},

We have received your payment of {{PaymentAmount}} for "{{ProjectName}}".

Remaining balance: {{BalanceAmount}}

Thank you!

{{StudioName}}`,
  invoice_ready: `Hello {{ClientName}},

Your invoice {{InvoiceNumber}} for "{{ProjectName}}" is ready.

{{StudioName}}`,
  files_shared: `Hello {{ClientName}},

Your project files for "{{ProjectName}}" are ready to download:

{{GoogleDriveLink}}

{{StudioName}}`,
  project_delivered: `Hello {{ClientName}},

Your project "{{ProjectName}}" has been delivered.

Thank you for choosing us!

{{StudioName}}`,
};

export function createDefaultTemplates(): WhatsAppTemplate[] {
  return (Object.keys(WHATSAPP_NOTIFICATION_LABELS) as WhatsAppNotificationType[]).map((id) => ({
    id,
    label: WHATSAPP_NOTIFICATION_LABELS[id],
    body: DEFAULT_TEMPLATE_BODIES[id],
    enabled: true,
  }));
}

export function createDefaultWhatsAppSettings(): WhatsAppSettings {
  return {
    templates: createDefaultTemplates(),
    updatedAt: new Date().toISOString(),
  };
}
