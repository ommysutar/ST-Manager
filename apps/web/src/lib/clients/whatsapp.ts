import type { ClientResponseDto } from "@st-manager/contracts";

type ClientWhatsAppFields = Pick<
  ClientResponseDto,
  "phone" | "whatsappNumber" | "whatsappSameAsPhone"
>;

/** Resolves the effective WhatsApp number for a client record. */
export function getClientWhatsAppNumber(client: ClientWhatsAppFields): string | null {
  if (client.whatsappSameAsPhone) {
    const phone = client.phone?.trim();
    return phone || null;
  }

  const whatsapp = client.whatsappNumber?.trim();
  return whatsapp || null;
}

/** Normalizes a phone number for wa.me links (digits only, with country code). */
export function normalizeWhatsAppPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/** Builds a WhatsApp deep-link URL with a pre-filled message. */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const digits = normalizeWhatsAppPhone(phoneNumber);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}
