import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import type { ApiEnv } from "@st-manager/validation";

import type { EmailMessage, EmailProvider, EmailSendResult } from "../email.types";

const SENDER_NAME = "ST Manager";

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly id = "resend";

  private readonly logger = new Logger(ResendEmailProvider.name);
  private client: Resend | null = null;

  constructor(private readonly configService: ConfigService<ApiEnv, true>) {}

  private getClient(): Resend {
    if (!this.client) {
      const apiKey = this.configService.get("RESEND_API_KEY", { infer: true });
      if (!apiKey) {
        throw new Error("Resend email provider is missing RESEND_API_KEY");
      }
      this.client = new Resend(apiKey);
    }
    return this.client;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const emailFrom = this.configService.get("EMAIL_FROM", { infer: true });
    if (!emailFrom) {
      throw new Error("Resend email provider is missing EMAIL_FROM");
    }

    const from = `${SENDER_NAME} <${emailFrom}>`;

    this.logger.log(
      `[ResendEmailProvider] Sending to=${message.to} from=${from} subject="${message.subject}"`,
    );

    const { data, error } = await this.getClient().emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text ?? message.html.replace(/<[^>]+>/g, " "),
    });

    if (error) {
      this.logger.error(`[ResendEmailProvider] Send failed: ${error.message}`);
      throw new Error(`Resend email send failed: ${error.message}`);
    }

    this.logger.log(`[ResendEmailProvider] Send succeeded messageId=${data?.id ?? "n/a"}`);

    return {
      providerId: this.id,
      messageId: data?.id,
      rawResponse: { data, error },
    };
  }
}
