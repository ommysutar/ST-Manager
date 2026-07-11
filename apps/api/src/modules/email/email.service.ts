import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@st-manager/validation";

import type { EmailMessage, EmailProvider } from "./email.types";
import { EMAIL_PROVIDER, EMAIL_PROVIDER_ID } from "./email.types";

export interface TeamInvitationEmailParams {
  to: string;
  studioName: string;
  invitedByName: string | null;
  invitedByEmail: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    @Inject(EMAIL_PROVIDER_ID) private readonly providerId: string,
    private readonly configService: ConfigService<ApiEnv, true>,
  ) {
    this.logger.log(`Email provider registered: ${this.providerId}`);
  }

  async sendTeamInvitation(params: TeamInvitationEmailParams): Promise<void> {
    this.logger.log(
      `Team invitation email: preparing send to=${params.to} studio="${params.studioName}" role=${params.role}`,
    );
    this.logger.log(`Email provider selected: ${this.providerId}`);

    const expiryLabel = params.expiresAt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const invitedBy = params.invitedByName
      ? `${params.invitedByName} (${params.invitedByEmail})`
      : params.invitedByEmail;

    const message: EmailMessage = {
      to: params.to,
      subject: `You're invited to join ${params.studioName} on ST Manager`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2>Team invitation</h2>
          <p>You have been invited to join <strong>${params.studioName}</strong> on ST Manager.</p>
          <p><strong>Invited by:</strong> ${invitedBy}</p>
          <p><strong>Role:</strong> ${params.role}</p>
          <p><strong>Invitation expires:</strong> ${expiryLabel} (7 days)</p>
          <p style="margin: 32px 0;">
            <a href="${params.acceptUrl}" style="background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
              Accept Invitation
            </a>
          </p>
          <p style="color:#666;font-size:14px;">If you did not expect this invitation, you can ignore this email.</p>
        </div>
      `,
      text: [
        `You have been invited to join ${params.studioName} on ST Manager.`,
        `Invited by: ${invitedBy}`,
        `Role: ${params.role}`,
        `Invitation expires: ${expiryLabel}`,
        `Accept: ${params.acceptUrl}`,
      ].join("\n"),
    };

    this.logger.log(`Sending team invitation email to=${params.to} via provider=${this.providerId}...`);
    this.logger.log(`Invitation accept URL: ${params.acceptUrl}`);

    try {
      const result = await this.provider.send(message);
      this.logger.log(
        `Team invitation email sent successfully to=${params.to} provider=${result.providerId} messageId=${result.messageId ?? "n/a"}`,
      );
      if (result.rawResponse) {
        this.logger.log(`Email provider response: ${JSON.stringify(result.rawResponse)}`);
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Team invitation email failed to=${params.to} provider=${this.providerId} error=${messageText}`,
      );
      throw error;
    }
  }

  buildInvitationUrl(token: string): string {
    const baseUrl =
      this.configService.get("APP_BASE_URL", { infer: true }) ?? "http://localhost:3000";
    return `${baseUrl.replace(/\/$/, "")}/invite/accept?token=${encodeURIComponent(token)}`;
  }

  async sendClientPortalLink(params: {
    to: string;
    studioName: string;
    projectName: string;
    clientName: string;
    portalUrl: string;
    estimatedCompletionDate: string | null;
    expiresAtLabel: string | null;
  }): Promise<void> {
    const estimateLabel = params.estimatedCompletionDate
      ? new Date(params.estimatedCompletionDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "To be confirmed";

    const expiryBlock = params.expiresAtLabel
      ? `<p><strong>Link expires:</strong> ${params.expiresAtLabel}</p>`
      : `<p><strong>Link expiry:</strong> Active until the project is completed (then 7 days).</p>`;

    const message: EmailMessage = {
      to: params.to,
      subject: "Your Project Portal - ST Manager",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
          <h2 style="margin-bottom: 8px;">Your Project Portal</h2>
          <p style="color:#64748b;margin-top:0;">Secure read-only access from ${params.studioName}</p>
          <p><strong>Studio:</strong> ${params.studioName}</p>
          <p><strong>Project:</strong> ${params.projectName}</p>
          <p><strong>Client:</strong> ${params.clientName}</p>
          <p><strong>Estimated completion:</strong> ${estimateLabel}</p>
          ${expiryBlock}
          <p style="margin: 32px 0;">
            <a href="${params.portalUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">
              Open Project Portal
            </a>
          </p>
          <p style="color:#64748b;font-size:13px;">This link is private. Do not share it publicly.</p>
        </div>
      `,
      text: [
        `Your Project Portal - ST Manager`,
        `Studio: ${params.studioName}`,
        `Project: ${params.projectName}`,
        `Client: ${params.clientName}`,
        `Estimated completion: ${estimateLabel}`,
        params.expiresAtLabel ? `Link expires: ${params.expiresAtLabel}` : "Link is active until project completion (+7 days).",
        `Open: ${params.portalUrl}`,
      ].join("\n"),
    };

    this.logger.log(`Sending client portal email to=${params.to} via provider=${this.providerId}...`);
    await this.provider.send(message);
  }
}
