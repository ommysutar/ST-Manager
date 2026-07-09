export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSendResult {
  providerId: string;
  messageId?: string;
  rawResponse?: unknown;
}

export interface EmailProvider {
  readonly id: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export const EMAIL_PROVIDER = Symbol("EMAIL_PROVIDER");
export const EMAIL_PROVIDER_ID = Symbol("EMAIL_PROVIDER_ID");
