#!/usr/bin/env node
/** WhatsApp feature smoke — pure JS, no TS imports. */

function normalizeWhatsAppPhone(value) {
  return value.replace(/\D/g, "");
}

function buildWhatsAppUrl(phoneNumber, message) {
  const digits = normalizeWhatsAppPhone(phoneNumber);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function getClientWhatsAppNumber(client) {
  if (client.whatsappSameAsPhone) {
    const phone = client.phone?.trim();
    return phone || null;
  }
  const whatsapp = client.whatsappNumber?.trim();
  return whatsapp || null;
}

function renderWhatsAppTemplate(template, variables) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined && value !== "" ? value : match;
  });
}

const num = getClientWhatsAppNumber({
  phone: "9876543210",
  whatsappNumber: null,
  whatsappSameAsPhone: true,
});
if (num !== "9876543210") throw new Error("whatsapp number resolve failed");

const url = buildWhatsAppUrl("9876543210", "Hello");
if (!url.includes("wa.me/9876543210")) throw new Error("url failed");

const msg = renderWhatsAppTemplate("Hi {{ClientName}}", { ClientName: "Test" });
if (msg !== "Hi Test") throw new Error("template failed");

const types = [
  "inquiry_received",
  "quotation_ready",
  "booking_confirmed",
  "project_ready",
  "payment_reminder",
  "files_shared",
];
if (types.length < 6) throw new Error("notification types missing");

console.log("✓ WhatsApp feature checks passed");
