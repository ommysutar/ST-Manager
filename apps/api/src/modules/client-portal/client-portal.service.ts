import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  ClientPortalAccessResponseDto,
  ClientPortalCreateResponseDto,
  ClientPortalLinkMetaDto,
  ClientPortalSnapshotDto,
} from "@st-manager/contracts";
import type {
  ApiEnv,
  ClientPortalCreateOrSyncInput,
  ClientPortalEmailInput,
} from "@st-manager/validation";
import { createHash, randomBytes } from "node:crypto";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { EmailService } from "../email/email.service";
import { ClientPortalRepository } from "./client-portal.repository";

const COMPLETED_STATUSES = new Set(["completed", "delivered"]);
const EXPIRY_DAYS_AFTER_COMPLETE = 7;

@Injectable()
export class ClientPortalService {
  constructor(
    private readonly repository: ClientPortalRepository,
    private readonly authRepository: AuthRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService<ApiEnv, true>,
  ) {}

  async getMeta(actor: AuthenticatedUser, projectKey: string): Promise<ClientPortalLinkMetaDto> {
    const studioId = await this.requireStudioId(actor);
    const link = await this.repository.findByStudioAndProject(studioId, projectKey);
    if (!link) {
      return this.emptyMeta();
    }

    const resolved = this.resolveStatus(link.status, link.expiresAt);
    if (resolved !== link.status) {
      await this.repository.update(link.id, { status: resolved });
    }

    return this.toMeta(link, resolved);
  }

  async create(
    actor: AuthenticatedUser,
    projectKey: string,
    input: ClientPortalCreateOrSyncInput,
  ): Promise<ClientPortalCreateResponseDto["data"]> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.repository.findByStudioAndProject(studioId, projectKey);
    if (existing && existing.status !== "expired") {
      return this.regenerate(actor, projectKey, input);
    }

    const { token, tokenHash } = this.generateToken();
    const snapshot = this.normalizeSnapshot(input.snapshot);
    const expiryFields = this.computeExpiryFields(snapshot.projectStatus, null);
    const studioMessage = input.studioMessage ?? snapshot.studioMessage ?? null;

    const link = existing
      ? await this.repository.update(existing.id, {
          tokenHash,
          status: "active",
          disabledAt: null,
          expiresAt: expiryFields.expiresAt,
          completedAt: expiryFields.completedAt,
          snapshot,
          studioMessage,
        })
      : await this.repository.create({
          studioId,
          projectKey,
          tokenHash,
          status: "active",
          expiresAt: expiryFields.expiresAt,
          completedAt: expiryFields.completedAt,
          snapshot,
          studioMessage,
        });

    const portalUrl = this.buildPortalUrl(token);
    return { meta: this.toMeta(link, "active", portalUrl), token, portalUrl };
  }

  async regenerate(
    actor: AuthenticatedUser,
    projectKey: string,
    input: ClientPortalCreateOrSyncInput,
  ): Promise<ClientPortalCreateResponseDto["data"]> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.repository.findByStudioAndProject(studioId, projectKey);
    const { token, tokenHash } = this.generateToken();
    const snapshot = this.normalizeSnapshot(input.snapshot);
    const expiryFields = this.computeExpiryFields(snapshot.projectStatus, existing?.completedAt ?? null);
    const studioMessage = input.studioMessage ?? snapshot.studioMessage ?? existing?.studioMessage ?? null;

    const link = existing
      ? await this.repository.update(existing.id, {
          tokenHash,
          status: "active",
          disabledAt: null,
          expiresAt: expiryFields.expiresAt,
          completedAt: expiryFields.completedAt,
          snapshot,
          studioMessage,
        })
      : await this.repository.create({
          studioId,
          projectKey,
          tokenHash,
          status: "active",
          expiresAt: expiryFields.expiresAt,
          completedAt: expiryFields.completedAt,
          snapshot,
          studioMessage,
        });

    const portalUrl = this.buildPortalUrl(token);
    return { meta: this.toMeta(link, "active", portalUrl), token, portalUrl };
  }

  async syncSnapshot(
    actor: AuthenticatedUser,
    projectKey: string,
    input: ClientPortalCreateOrSyncInput,
  ): Promise<ClientPortalLinkMetaDto> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.repository.findByStudioAndProject(studioId, projectKey);
    if (!existing) {
      throw new NotFoundException("Client portal link not found. Create a link first.");
    }

    const expiryFields = this.computeExpiryFields(input.snapshot.projectStatus, existing.completedAt);
    const studioMessage =
      input.studioMessage !== undefined
        ? input.studioMessage
        : (input.snapshot.studioMessage ?? existing.studioMessage);
    const baseStatus = existing.status === "disabled" ? "disabled" : "active";
    const resolved = this.resolveStatus(baseStatus, expiryFields.expiresAt);
    const snapshot = this.normalizeSnapshot(input.snapshot);
    const link = await this.repository.update(existing.id, {
      snapshot,
      studioMessage,
      expiresAt: expiryFields.expiresAt,
      completedAt: expiryFields.completedAt,
      status: resolved,
    });
    return this.toMeta(link, resolved);
  }

  async disable(actor: AuthenticatedUser, projectKey: string): Promise<ClientPortalLinkMetaDto> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.repository.findByStudioAndProject(studioId, projectKey);
    if (!existing) {
      throw new NotFoundException("Client portal link not found");
    }
    const link = await this.repository.update(existing.id, {
      status: "disabled",
      disabledAt: new Date(),
    });
    return this.toMeta(link, "disabled");
  }

  async enable(actor: AuthenticatedUser, projectKey: string): Promise<ClientPortalLinkMetaDto> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.repository.findByStudioAndProject(studioId, projectKey);
    if (!existing) {
      throw new NotFoundException("Client portal link not found");
    }
    const resolved = this.resolveStatus("active", existing.expiresAt);
    if (resolved === "expired") {
      throw new BadRequestException("Link has expired. Regenerate a new secure link.");
    }
    const link = await this.repository.update(existing.id, {
      status: "active",
      disabledAt: null,
    });
    return this.toMeta(link, "active");
  }

  async accessByToken(token: string): Promise<ClientPortalAccessResponseDto["data"]> {
    const link = await this.repository.findByTokenHash(this.hashToken(token));
    if (!link) {
      throw new NotFoundException("This project link is invalid.");
    }

    const resolved = this.resolveStatus(link.status, link.expiresAt);
    if (resolved !== link.status) {
      await this.repository.update(link.id, { status: resolved });
    }
    if (resolved === "disabled") {
      throw new GoneException("This project link has been disabled.");
    }
    if (resolved === "expired") {
      throw new GoneException(
        "This project link has expired. Please contact your Studio if you need access again.",
      );
    }

    return {
      status: "active",
      expiresAt: link.expiresAt?.toISOString() ?? null,
      snapshot: link.snapshot as unknown as ClientPortalSnapshotDto,
    };
  }

  async sendEmail(
    actor: AuthenticatedUser,
    projectKey: string,
    input: ClientPortalEmailInput,
    portalUrl: string,
  ): Promise<void> {
    const studioId = await this.requireStudioId(actor);
    const link = await this.repository.findByStudioAndProject(studioId, projectKey);
    if (!link) {
      throw new NotFoundException("Client portal link not found");
    }
    const snapshot = link.snapshot as unknown as ClientPortalSnapshotDto;
    const to = input.to?.trim() || undefined;
    const recipient = to || null;
    if (!recipient) {
      throw new BadRequestException("Recipient email is required");
    }

    const expiryLabel = link.expiresAt
      ? link.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : null;

    await this.emailService.sendClientPortalLink({
      to: recipient,
      studioName: snapshot.studio.name,
      projectName: snapshot.projectName,
      clientName: snapshot.clientName,
      portalUrl,
      estimatedCompletionDate: snapshot.estimate.estimatedCompletionDate,
      expiresAtLabel: expiryLabel,
    });
  }

  private async requireStudioId(actor: AuthenticatedUser): Promise<string> {
    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }

  private generateToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString("hex");
    return { token, tokenHash: this.hashToken(token) };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private buildPortalUrl(token: string): string {
    const base = this.configService.get("APP_BASE_URL", { infer: true }) ?? "https://stmanager.app";
    return `${base.replace(/\/$/, "")}/client/project/${token}`;
  }

  private computeExpiryFields(
    projectStatus: string,
    existingCompletedAt: Date | null,
  ): { expiresAt: Date | null; completedAt: Date | null } {
    if (!COMPLETED_STATUSES.has(projectStatus)) {
      return { expiresAt: null, completedAt: existingCompletedAt };
    }
    const completedAt = existingCompletedAt ?? new Date();
    const expiresAt = new Date(completedAt);
    expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS_AFTER_COMPLETE);
    return { expiresAt, completedAt };
  }

  private normalizeSnapshot(input: ClientPortalCreateOrSyncInput["snapshot"]): ClientPortalSnapshotDto {
    return {
      projectName: input.projectName,
      clientName: input.clientName,
      service: input.service ?? "",
      packageName: input.packageName ?? "",
      currentStatus: input.currentStatus,
      progressPercent: input.progressPercent,
      studio: {
        name: input.studio.name,
        logoDataUrl: input.studio.logoDataUrl ?? "",
        address: input.studio.address ?? "",
        phone: input.studio.phone ?? "",
        email: input.studio.email ?? "",
      },
      estimate: {
        estimatedCompletionDate: input.estimate.estimatedCompletionDate ?? null,
        scheduleStatus: input.estimate.scheduleStatus,
        expectedCompletionDate: input.estimate.expectedCompletionDate ?? null,
        delayReason: input.estimate.delayReason ?? null,
      },
      timeline: input.timeline,
      upcomingBooking: input.upcomingBooking ?? null,
      payment: input.payment,
      documents: input.documents.map((doc) => ({
        type: doc.type,
        title: doc.title,
        number: doc.number,
        issuedAt: doc.issuedAt ?? null,
        total: doc.total,
        currency: doc.currency ?? "INR",
        lineItems: doc.lineItems,
      })),
      studioMessage: input.studioMessage ?? null,
      projectStatus: input.projectStatus,
    };
  }

  private resolveStatus(status: string, expiresAt: Date | null): "active" | "disabled" | "expired" {
    if (status === "disabled") return "disabled";
    if (expiresAt && expiresAt.getTime() <= Date.now()) return "expired";
    return "active";
  }

  private emptyMeta(): ClientPortalLinkMetaDto {
    return {
      status: "missing",
      createdAt: null,
      expiresAt: null,
      hasLink: false,
      portalUrl: null,
      studioMessage: null,
    };
  }

  private toMeta(
    link: { createdAt: Date; expiresAt: Date | null; studioMessage: string | null },
    status: "active" | "disabled" | "expired" | "missing",
    portalUrl: string | null = null,
  ): ClientPortalLinkMetaDto {
    return {
      status,
      createdAt: link.createdAt.toISOString(),
      expiresAt: link.expiresAt?.toISOString() ?? null,
      hasLink: status !== "missing",
      portalUrl,
      studioMessage: link.studioMessage,
    };
  }
}
