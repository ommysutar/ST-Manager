import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { LoginResponseDataDto } from "@st-manager/contracts";
import {
  INVITATION_STATUSES,
  MEMBER_STATUSES,
  TEAM_ROLES,
} from "@st-manager/constants";
import type {
  AcceptInvitationInput,
  InviteTeamMemberInput,
  TransferOwnershipInput,
  UpdateTeamMemberInput,
} from "@st-manager/validation";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthService } from "../auth/auth.service";
import { AUDIT_ACTIONS, AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";
import {
  toInvitationPreviewDto,
  toPendingInvitationDto,
  toPermissionDto,
  toRoleDefinitionDto,
  toTeamMemberDto,
  toTeamMemberList,
} from "./team.mapper";
import { TeamRepository } from "./team.repository";

const INVITATION_TTL_DAYS = 7;

@Injectable()
export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {}

  async listMembers(actor: AuthenticatedUser) {
    const studioId = await this.requireActorStudio(actor);
    const [members, invitations] = await Promise.all([
      this.teamRepository.listMembersByStudio(studioId),
      this.teamRepository.listPendingInvitations(studioId),
    ]);
    return toTeamMemberList(members, invitations);
  }

  async inviteMember(actor: AuthenticatedUser, input: InviteTeamMemberInput) {
    const studioId = await this.requireActorStudio(actor);
    this.assertOwner(actor);
    const email = input.email.toLowerCase();

    const existingUser = await this.teamRepository.findUserByEmail(email);
    if (existingUser?.studioId === studioId) {
      throw new ConflictException("This email is already a member of your studio");
    }
    if (existingUser?.studioId && existingUser.studioId !== studioId) {
      throw new ConflictException("This email belongs to another studio workspace");
    }

    const pendingInvite = await this.teamRepository.findPendingInvitationByEmail(studioId, email);
    if (pendingInvite) {
      throw new ConflictException("A pending invitation already exists for this email");
    }

    const { token, tokenHash } = this.generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const invitation = await this.teamRepository.createInvitation({
      studioId,
      email,
      fullName: input.fullName,
      phone: input.phone,
      role: input.role,
      tokenHash,
      expiresAt,
      invitedById: actor.userId,
      customPermissions: input.customPermissions,
    });

    const studioName = (await this.teamRepository.getStudioName(studioId)) ?? "Studio";
    const inviter = await this.teamRepository.findUserById(actor.userId);

    await this.emailService.sendTeamInvitation({
      to: email,
      studioName,
      invitedByName: inviter?.fullName ?? null,
      invitedByEmail: inviter?.email ?? actor.email,
      role: input.role,
      acceptUrl: this.emailService.buildInvitationUrl(token),
      expiresAt,
    });

    await this.auditService.log({
      studioId,
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.MEMBER_INVITED,
      targetType: "invitation",
      targetId: invitation.id,
      metadata: { email, role: input.role },
    });

    return toPendingInvitationDto(invitation);
  }

  async updateMember(actor: AuthenticatedUser, memberId: string, input: UpdateTeamMemberInput) {
    const studioId = await this.requireActorStudio(actor);
    this.assertOwner(actor);
    const member = await this.getStudioMemberOrThrow(studioId, memberId);

    if (member.id === actor.userId && input.role && input.role !== TEAM_ROLES.OWNER) {
      throw new BadRequestException("You cannot change your own owner role");
    }

    if (member.role === TEAM_ROLES.OWNER && input.role && input.role !== TEAM_ROLES.OWNER) {
      const members = await this.teamRepository.listMembersByStudio(studioId);
      const ownerCount = members.filter((m) => m.role === TEAM_ROLES.OWNER && m.status === MEMBER_STATUSES.ACTIVE).length;
      if (ownerCount <= 1) {
        throw new BadRequestException("Transfer ownership before changing the only owner's role");
      }
    }

    const updated = await this.teamRepository.updateMember(memberId, {
      fullName: input.fullName,
      phone: input.phone,
      role: input.role,
      customPermissions: input.customPermissions,
    });

    if (input.role && input.role !== member.role) {
      await this.auditService.log({
        studioId,
        actorUserId: actor.userId,
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        targetType: "user",
        targetId: memberId,
        metadata: { from: member.role, to: input.role },
      });
    }

    if (input.customPermissions !== undefined) {
      await this.auditService.log({
        studioId,
        actorUserId: actor.userId,
        action: AUDIT_ACTIONS.PERMISSION_UPDATED,
        targetType: "user",
        targetId: memberId,
        metadata: { customPermissions: input.customPermissions },
      });
    }

    return toTeamMemberDto(updated);
  }

  async enableMember(actor: AuthenticatedUser, memberId: string) {
    const studioId = await this.requireActorStudio(actor);
    this.assertOwner(actor);
    const member = await this.getStudioMemberOrThrow(studioId, memberId);

    if (member.status !== MEMBER_STATUSES.DISABLED) {
      throw new BadRequestException("Member is not disabled");
    }

    const updated = await this.teamRepository.updateMember(memberId, {
      status: MEMBER_STATUSES.ACTIVE,
    });

    await this.auditService.log({
      studioId,
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.MEMBER_ENABLED,
      targetType: "user",
      targetId: memberId,
    });

    return toTeamMemberDto(updated);
  }

  async resendInvitation(actor: AuthenticatedUser, invitationId: string) {
    const studioId = await this.requireActorStudio(actor);
    this.assertOwner(actor);
    const invitation = await this.getStudioInvitationOrThrow(studioId, invitationId);

    if (invitation.status !== INVITATION_STATUSES.PENDING) {
      throw new BadRequestException("Only pending invitations can be resent");
    }

    const { token, tokenHash } = this.generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const updated = await this.teamRepository.updateInvitationToken(invitation.id, {
      tokenHash,
      expiresAt,
    });

    const studioName = (await this.teamRepository.getStudioName(studioId)) ?? "Studio";
    const inviter = await this.teamRepository.findUserById(actor.userId);

    await this.emailService.sendTeamInvitation({
      to: invitation.email,
      studioName,
      invitedByName: inviter?.fullName ?? null,
      invitedByEmail: inviter?.email ?? actor.email,
      role: invitation.role,
      acceptUrl: this.emailService.buildInvitationUrl(token),
      expiresAt,
    });

    await this.auditService.log({
      studioId,
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.INVITATION_RESENT,
      targetType: "invitation",
      targetId: invitation.id,
      metadata: { email: invitation.email },
    });

    return toPendingInvitationDto(updated);
  }

  async cancelInvitation(actor: AuthenticatedUser, invitationId: string) {
    const studioId = await this.requireActorStudio(actor);
    this.assertOwner(actor);
    const invitation = await this.getStudioInvitationOrThrow(studioId, invitationId);

    if (invitation.status !== INVITATION_STATUSES.PENDING) {
      throw new BadRequestException("Only pending invitations can be cancelled");
    }

    await this.teamRepository.cancelInvitation(invitation.id);

    await this.auditService.log({
      studioId,
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.INVITATION_CANCELLED,
      targetType: "invitation",
      targetId: invitation.id,
      metadata: { email: invitation.email },
    });
  }

  async disableMember(actor: AuthenticatedUser, memberId: string) {
    const studioId = await this.requireActorStudio(actor);
    this.assertOwner(actor);
    const member = await this.getStudioMemberOrThrow(studioId, memberId);

    if (member.id === actor.userId) {
      throw new BadRequestException("You cannot disable your own account");
    }

    if (member.role === TEAM_ROLES.OWNER) {
      throw new BadRequestException("Transfer ownership before disabling the owner");
    }

    const updated = await this.teamRepository.updateMember(memberId, {
      status: MEMBER_STATUSES.DISABLED,
    });

    await this.auditService.log({
      studioId,
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.MEMBER_DISABLED,
      targetType: "user",
      targetId: memberId,
    });

    return toTeamMemberDto(updated);
  }

  async removeMember(actor: AuthenticatedUser, memberId: string) {
    const studioId = await this.requireActorStudio(actor);
    this.assertOwner(actor);
    const member = await this.getStudioMemberOrThrow(studioId, memberId);

    if (member.id === actor.userId) {
      throw new BadRequestException("You cannot remove your own account");
    }

    if (member.role === TEAM_ROLES.OWNER) {
      throw new BadRequestException("Transfer ownership before removing the owner");
    }

    await this.teamRepository.deleteMember(memberId);

    await this.auditService.log({
      studioId,
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.MEMBER_REMOVED,
      targetType: "user",
      targetId: memberId,
      metadata: { email: member.email },
    });
  }

  async transferOwnership(actor: AuthenticatedUser, input: TransferOwnershipInput) {
    const studioId = await this.requireActorStudio(actor);
    this.assertOwner(actor);
    const newOwner = await this.getStudioMemberOrThrow(studioId, input.newOwnerUserId);

    if (newOwner.id === actor.userId) {
      throw new BadRequestException("You are already the owner");
    }

    if (newOwner.status !== MEMBER_STATUSES.ACTIVE) {
      throw new BadRequestException("The new owner must be an active member");
    }

    await this.teamRepository.transferOwnership(studioId, actor.userId, newOwner.id);

    await this.auditService.log({
      studioId,
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.OWNERSHIP_TRANSFERRED,
      targetType: "user",
      targetId: newOwner.id,
      metadata: { previousOwnerId: actor.userId },
    });
  }

  async listPermissions() {
    const permissions = await this.teamRepository.listPermissions();
    return permissions.map(toPermissionDto);
  }

  async listRoles() {
    const roles = await this.teamRepository.listSystemRoles();
    return roles.map(toRoleDefinitionDto);
  }

  async verifyInvitation(token: string) {
    const invitation = await this.findValidInvitationByToken(token);
    return toInvitationPreviewDto(invitation);
  }

  async acceptInvitation(token: string, input: AcceptInvitationInput): Promise<LoginResponseDataDto> {
    const invitation = await this.findValidInvitationByToken(token);
    const email = invitation.email.toLowerCase();

    const existingUser = await this.teamRepository.findUserByEmail(email);
    if (existingUser) {
      if (existingUser.studioId === invitation.studioId) {
        throw new ConflictException("You are already a member of this studio");
      }
      throw new ConflictException("This email is already registered with another studio");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const member = await this.teamRepository.createMemberFromInvitation({
      email,
      passwordHash,
      fullName: invitation.fullName,
      phone: invitation.phone,
      role: invitation.role,
      studioId: invitation.studioId,
      customPermissions: Array.isArray(invitation.customPermissions)
        ? (invitation.customPermissions as string[])
        : null,
    });

    await this.teamRepository.updateInvitation(invitation.id, {
      status: INVITATION_STATUSES.ACCEPTED,
      acceptedAt: new Date(),
    });

    await this.auditService.log({
      studioId: invitation.studioId,
      actorUserId: member.id,
      action: AUDIT_ACTIONS.MEMBER_ACCEPTED,
      targetType: "user",
      targetId: member.id,
      metadata: { invitationId: invitation.id },
    });

    return this.authService.loginWithUser(member.id);
  }

  private async findValidInvitationByToken(token: string) {
    const tokenHash = this.hashToken(token);
    const invitation = await this.teamRepository.findInvitationByTokenHash(tokenHash);

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status === INVITATION_STATUSES.ACCEPTED) {
      throw new BadRequestException("This invitation has already been used");
    }

    if (invitation.status !== INVITATION_STATUSES.PENDING) {
      throw new BadRequestException("This invitation is no longer valid");
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.teamRepository.updateInvitation(invitation.id, {
        status: INVITATION_STATUSES.EXPIRED,
      });
      throw new BadRequestException("This invitation has expired");
    }

    return invitation;
  }

  private generateInvitationToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString("hex");
    return { token, tokenHash: this.hashToken(token) };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async requireActorStudio(actor: AuthenticatedUser): Promise<string> {
    const user = await this.teamRepository.findUserById(actor.userId);
    if (!user?.studioId) {
      throw new ForbiddenException("Your account is not linked to a studio workspace");
    }
    if (user.status === MEMBER_STATUSES.DISABLED) {
      throw new ForbiddenException("Your account has been disabled");
    }
    return user.studioId;
  }

  private assertOwner(actor: AuthenticatedUser): void {
    if (actor.role !== TEAM_ROLES.OWNER) {
      throw new ForbiddenException("Only the studio owner can perform this action");
    }
  }

  private async getStudioInvitationOrThrow(studioId: string, invitationId: string) {
    const invitation = await this.teamRepository.findInvitationById(invitationId);
    if (!invitation || invitation.studioId !== studioId) {
      throw new NotFoundException("Invitation not found");
    }
    return invitation;
  }

  private async getStudioMemberOrThrow(studioId: string, memberId: string) {
    const member = await this.teamRepository.findUserById(memberId);
    if (!member || member.studioId !== studioId) {
      throw new NotFoundException("Team member not found");
    }
    return member;
  }
}
