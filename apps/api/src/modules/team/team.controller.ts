import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  AcceptInvitationResponseDto,
  CompleteInvitationResponseDto,
  DisableTeamMemberResponseDto,
  EnableTeamMemberResponseDto,
  InviteTeamMemberResponseDto,
  ListPermissionsResponseDto,
  ListRolesResponseDto,
  ListTeamMembersResponseDto,
  RemoveTeamMemberResponseDto,
  ResendInvitationResponseDto,
  TransferOwnershipResponseDto,
  UpdateTeamMemberResponseDto,
  VerifyInvitationResponseDto,
} from "@st-manager/contracts";
import {
  acceptInvitationSchema,
  inviteTeamMemberSchema,
  transferOwnershipSchema,
  updateTeamMemberSchema,
  type AcceptInvitationInput,
  type InviteTeamMemberInput,
  type TransferOwnershipInput,
  type UpdateTeamMemberInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OwnerGuard } from "./guards/owner.guard";
import { TeamViewerGuard } from "./guards/team-viewer.guard";
import { TeamService } from "./team.service";

@Controller(ROUTES.TEAM_MEMBERS)
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  @UseGuards(TeamViewerGuard)
  async list(@CurrentUser() user: AuthenticatedUser): Promise<ListTeamMembersResponseDto> {
    const data = await this.teamService.listMembers(user);
    return { success: true, data };
  }

  @Post("invite")
  @UseGuards(OwnerGuard)
  @HttpCode(201)
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(inviteTeamMemberSchema)) body: InviteTeamMemberInput,
  ): Promise<InviteTeamMemberResponseDto> {
    const data = await this.teamService.inviteMember(user, body);
    return { success: true, data };
  }

  @Post("transfer-ownership")
  @UseGuards(OwnerGuard)
  async transferOwnership(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(transferOwnershipSchema)) body: TransferOwnershipInput,
  ): Promise<TransferOwnershipResponseDto> {
    await this.teamService.transferOwnership(user, body);
    return { success: true };
  }

  @Post("invitations/:invitationId/resend")
  @UseGuards(OwnerGuard)
  async resendInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invitationId") invitationId: string,
  ): Promise<ResendInvitationResponseDto> {
    const data = await this.teamService.resendInvitation(user, invitationId);
    return { success: true, data };
  }

  @Delete("invitations/:invitationId")
  @UseGuards(OwnerGuard)
  @HttpCode(200)
  async cancelInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invitationId") invitationId: string,
  ): Promise<RemoveTeamMemberResponseDto> {
    await this.teamService.cancelInvitation(user, invitationId);
    return { success: true };
  }

  @Patch(":id")
  @UseGuards(OwnerGuard)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTeamMemberSchema)) body: UpdateTeamMemberInput,
  ): Promise<UpdateTeamMemberResponseDto> {
    const data = await this.teamService.updateMember(user, id, body);
    return { success: true, data };
  }

  @Post(":id/disable")
  @UseGuards(OwnerGuard)
  async disable(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<DisableTeamMemberResponseDto> {
    const data = await this.teamService.disableMember(user, id);
    return { success: true, data };
  }

  @Post(":id/enable")
  @UseGuards(OwnerGuard)
  async enable(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<EnableTeamMemberResponseDto> {
    const data = await this.teamService.enableMember(user, id);
    return { success: true, data };
  }

  @Delete(":id")
  @UseGuards(OwnerGuard)
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<RemoveTeamMemberResponseDto> {
    await this.teamService.removeMember(user, id);
    return { success: true };
  }
}

@Controller(ROUTES.INVITATIONS)
export class InvitationsController {
  constructor(private readonly teamService: TeamService) {}

  @Get(":token")
  async verify(@Param("token") token: string): Promise<VerifyInvitationResponseDto> {
    const data = await this.teamService.verifyInvitation(token);
    return { success: true, data };
  }

  @Post(":token/accept")
  async accept(
    @Param("token") token: string,
    @Body(new ZodValidationPipe(acceptInvitationSchema)) body: AcceptInvitationInput,
  ): Promise<AcceptInvitationResponseDto> {
    const data = await this.teamService.acceptInvitation(token, body);
    return { success: true, data };
  }

  @Post(":token/accept-existing")
  @UseGuards(JwtAuthGuard)
  async acceptExisting(
    @Param("token") token: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompleteInvitationResponseDto> {
    await this.teamService.acceptInvitationForExistingUser(token, user);
    return { success: true, data: { message: "Invitation accepted successfully." } };
  }
}

@Controller(ROUTES.PERMISSIONS)
@UseGuards(JwtAuthGuard, OwnerGuard)
export class PermissionsController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async listPermissions(): Promise<ListPermissionsResponseDto> {
    const data = await this.teamService.listPermissions();
    return { success: true, data };
  }

  @Get("roles")
  async listRoles(): Promise<ListRolesResponseDto> {
    const data = await this.teamService.listRoles();
    return { success: true, data };
  }
}
