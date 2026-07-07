import { getWhatsAppTemplate, isWhatsAppNotificationEnabled } from "./storage";
import { renderWhatsAppTemplate } from "./templates";
import type { WhatsAppMessageVariables, WhatsAppNotificationType } from "./types";
import { getWhatsAppProvider } from "./provider";

export interface PrepareWhatsAppNotificationResult {
  ok: true;
  message: string;
  phoneNumber: string;
}

export interface PrepareWhatsAppNotificationError {
  ok: false;
  reason: "no_number" | "disabled" | "missing_template";
}

export type PrepareWhatsAppNotificationResponse =
  | PrepareWhatsAppNotificationResult
  | PrepareWhatsAppNotificationError;

/** Builds the final WhatsApp message without opening the provider. */
export function prepareWhatsAppNotification(params: {
  type: WhatsAppNotificationType;
  whatsappNumber: string | null | undefined;
  variables: WhatsAppMessageVariables;
}): PrepareWhatsAppNotificationResponse {
  const phoneNumber = params.whatsappNumber?.trim();
  if (!phoneNumber) {
    return { ok: false, reason: "no_number" };
  }

  if (!isWhatsAppNotificationEnabled(params.type)) {
    return { ok: false, reason: "disabled" };
  }

  const template = getWhatsAppTemplate(params.type);
  if (!template) {
    return { ok: false, reason: "missing_template" };
  }

  return {
    ok: true,
    phoneNumber,
    message: renderWhatsAppTemplate(template.body, params.variables),
  };
}

/** Prepares and delivers a WhatsApp notification via the active provider. */
export function sendWhatsAppNotification(params: {
  type: WhatsAppNotificationType;
  whatsappNumber: string | null | undefined;
  variables: WhatsAppMessageVariables;
}): PrepareWhatsAppNotificationResponse {
  const prepared = prepareWhatsAppNotification(params);
  if (!prepared.ok) {
    return prepared;
  }

  getWhatsAppProvider().send({
    phoneNumber: prepared.phoneNumber,
    message: prepared.message,
  });

  return prepared;
}
