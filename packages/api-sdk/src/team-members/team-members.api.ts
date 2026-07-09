import { ROUTES } from "@st-manager/constants";
import type {
  AcceptInvitationRequestDto,
  AcceptInvitationResponseDto,
  CancelInvitationResponseDto,
  DisableTeamMemberResponseDto,
  EnableTeamMemberResponseDto,
  InviteTeamMemberRequestDto,
  InviteTeamMemberResponseDto,
  ListPermissionsResponseDto,
  ListRolesResponseDto,
  ListTeamMembersResponseDto,
  PendingInvitationResponseDto,
  RemoveTeamMemberResponseDto,
  ResendInvitationResponseDto,
  TeamMemberResponseDto,
  TransferOwnershipRequestDto,
  TransferOwnershipResponseDto,
  UpdateTeamMemberRequestDto,
  UpdateTeamMemberResponseDto,
  VerifyInvitationResponseDto,
} from "@st-manager/contracts";
import {
  acceptInvitationSchema,
  inviteTeamMemberSchema,
  transferOwnershipSchema,
  updateTeamMemberSchema,
} from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface TeamMembersApi {
  listMembers(): Promise<ListTeamMembersResponseDto>;
  inviteMember(input: InviteTeamMemberRequestDto): Promise<InviteTeamMemberResponseDto["data"]>;
  updateMember(id: string, input: UpdateTeamMemberRequestDto): Promise<TeamMemberResponseDto>;
  disableMember(id: string): Promise<TeamMemberResponseDto>;
  enableMember(id: string): Promise<TeamMemberResponseDto>;
  removeMember(id: string): Promise<void>;
  resendInvitation(invitationId: string): Promise<PendingInvitationResponseDto>;
  cancelInvitation(invitationId: string): Promise<void>;
  transferOwnership(input: TransferOwnershipRequestDto): Promise<void>;
  listPermissions(): Promise<ListPermissionsResponseDto["data"]>;
  listRoles(): Promise<ListRolesResponseDto["data"]>;
  verifyInvitation(token: string): Promise<VerifyInvitationResponseDto["data"]>;
  acceptInvitation(token: string, input: AcceptInvitationRequestDto): Promise<AcceptInvitationResponseDto["data"]>;
}

export function createTeamMembersApi(client: HttpClient): TeamMembersApi {
  return {
    listMembers: () => client.get<ListTeamMembersResponseDto>(ROUTES.TEAM_MEMBERS),

    inviteMember: async (input) => {
      const validated = inviteTeamMemberSchema.parse(input);
      const response = await client.post<InviteTeamMemberResponseDto>(`${ROUTES.TEAM_MEMBERS}/invite`, validated);
      return response.data;
    },

    updateMember: async (id, input) => {
      const validated = updateTeamMemberSchema.parse(input);
      const response = await client.patch<UpdateTeamMemberResponseDto>(
        `${ROUTES.TEAM_MEMBERS}/${id}`,
        validated,
      );
      return response.data;
    },

    disableMember: async (id) => {
      const response = await client.post<DisableTeamMemberResponseDto>(
        `${ROUTES.TEAM_MEMBERS}/${id}/disable`,
        {},
      );
      return response.data;
    },

    enableMember: async (id) => {
      const response = await client.post<EnableTeamMemberResponseDto>(
        `${ROUTES.TEAM_MEMBERS}/${id}/enable`,
        {},
      );
      return response.data;
    },

    removeMember: async (id) => {
      await client.delete<RemoveTeamMemberResponseDto>(`${ROUTES.TEAM_MEMBERS}/${id}`);
    },

    resendInvitation: async (invitationId) => {
      const response = await client.post<ResendInvitationResponseDto>(
        `${ROUTES.TEAM_MEMBERS}/invitations/${invitationId}/resend`,
        {},
      );
      return response.data;
    },

    cancelInvitation: async (invitationId) => {
      await client.delete<CancelInvitationResponseDto>(
        `${ROUTES.TEAM_MEMBERS}/invitations/${invitationId}`,
      );
    },

    transferOwnership: async (input) => {
      const validated = transferOwnershipSchema.parse(input);
      await client.post<TransferOwnershipResponseDto>(`${ROUTES.TEAM_MEMBERS}/transfer-ownership`, validated);
    },

    listPermissions: async () => {
      const response = await client.get<ListPermissionsResponseDto>(ROUTES.PERMISSIONS);
      return response.data;
    },

    listRoles: async () => {
      const response = await client.get<ListRolesResponseDto>(`${ROUTES.PERMISSIONS}/roles`);
      return response.data;
    },

    verifyInvitation: async (token) => {
      const response = await client.get<VerifyInvitationResponseDto>(
        `${ROUTES.INVITATIONS}/${encodeURIComponent(token)}`,
      );
      return response.data;
    },

    acceptInvitation: async (token, input) => {
      const validated = acceptInvitationSchema.parse(input);
      const response = await client.post<AcceptInvitationResponseDto>(
        `${ROUTES.INVITATIONS}/${encodeURIComponent(token)}/accept`,
        validated,
      );
      return response.data;
    },
  };
}
