import { Injectable, Logger } from "@nestjs/common";

import type { EmailMessage, EmailProvider, EmailSendResult } from "../email.types";

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  readonly id = "console";

  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.logger.log(
      `[ConsoleEmailProvider] Sending email to=${message.to} subject="${message.subject}"`,
    );

    const preview = (message.text ?? message.html).slice(0, 240).replace(/\s+/g, " ");
    this.logger.log(`[ConsoleEmailProvider] Body preview: ${preview}${preview.length >= 240 ? "…" : ""}`);
    this.logger.warn(
      "[ConsoleEmailProvider] No real delivery — email logged to stdout only. Set EMAIL_PROVIDER=resend with RESEND_API_KEY for live delivery.",
    );

    return {
      providerId: this.id,
      rawResponse: { delivered: false, mode: "console-log-only" },
    };
  }
}
