import type { WhatsAppMessageVariables } from "./types";

/** Replaces {{Placeholder}} tokens in a template body with provided values. */
export function renderWhatsAppTemplate(
  template: string,
  variables: WhatsAppMessageVariables,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key as keyof WhatsAppMessageVariables];
    return value !== undefined && value !== "" ? value : match;
  });
}
