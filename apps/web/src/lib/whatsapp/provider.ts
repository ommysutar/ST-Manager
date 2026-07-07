import { buildWhatsAppUrl } from "@/lib/clients/whatsapp";

export interface WhatsAppSendParams {
  phoneNumber: string;
  message: string;
}

export interface WhatsAppNotificationProvider {
  readonly id: string;
  send(params: WhatsAppSendParams): void;
}

/** Opens WhatsApp Desktop / Web / Mobile with a pre-filled message. */
export class ClickToWhatsAppProvider implements WhatsAppNotificationProvider {
  readonly id = "click-to-whatsapp";

  send({ phoneNumber, message }: WhatsAppSendParams): void {
    const url = buildWhatsAppUrl(phoneNumber, message);
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

let activeProvider: WhatsAppNotificationProvider = new ClickToWhatsAppProvider();

export function getWhatsAppProvider(): WhatsAppNotificationProvider {
  return activeProvider;
}

/** Allows swapping the delivery provider without changing UI code. */
export function setWhatsAppProvider(provider: WhatsAppNotificationProvider): void {
  activeProvider = provider;
}
