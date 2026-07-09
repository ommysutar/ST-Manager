import { Injectable, Logger } from "@nestjs/common";

import type { EmailMessage, EmailProvider, EmailSendResult } from "../email.types";

@Injectable()
export class NoopEmailProvider implements EmailProvider {
  readonly id = "noop";

  private readonly logger = new Logger(NoopEmailProvider.name);

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.logger.warn(
      `[NoopEmailProvider] Skipping email delivery to=${message.to} subject="${message.subject}"`,
    );
    return {
      providerId: this.id,
      rawResponse: { delivered: false, mode: "noop" },
    };
  }
}
