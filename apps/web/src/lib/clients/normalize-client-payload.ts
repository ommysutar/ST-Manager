import { normalizeOptionalApiString } from "@st-manager/validation";

export interface ClientFormPayloadInput {
  name: string;
  phone?: string;
  whatsappNumber?: string;
  whatsappSameAsPhone?: boolean;
  email?: string;
  company?: string;
  notes?: string;
}

function resolveWhatsAppFields(input: ClientFormPayloadInput) {
  const phone = normalizeOptionalApiString(input.phone);
  const whatsappSameAsPhone = input.whatsappSameAsPhone ?? false;
  const whatsappNumber = whatsappSameAsPhone
    ? phone
    : normalizeOptionalApiString(input.whatsappNumber);

  return { phone, whatsappNumber, whatsappSameAsPhone };
}

/** Maps wizard/form client fields to a create-client API payload (no null strings). */
export function toClientCreatePayload(input: ClientFormPayloadInput) {
  const { phone, whatsappNumber, whatsappSameAsPhone } = resolveWhatsAppFields(input);

  return {
    name: input.name.trim(),
    phone,
    whatsappNumber,
    whatsappSameAsPhone,
    email: normalizeOptionalApiString(input.email),
    company: normalizeOptionalApiString(input.company),
    notes: normalizeOptionalApiString(input.notes),
  };
}

export function toClientUpdatePayload(values: ClientFormPayloadInput) {
  const { phone, whatsappNumber, whatsappSameAsPhone } = resolveWhatsAppFields(values);

  return {
    name: values.name,
    email: normalizeOptionalApiString(values.email),
    phone,
    whatsappNumber,
    whatsappSameAsPhone,
    company: normalizeOptionalApiString(values.company),
    notes: normalizeOptionalApiString(values.notes),
  };
}
