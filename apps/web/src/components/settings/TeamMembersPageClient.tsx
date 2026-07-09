"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@st-manager/ui";
import { TEAM_ROLE_LABELS } from "@st-manager/constants";
import type {
  PendingInvitationResponseDto,
  PermissionResponseDto,
  TeamMemberListItemDto,
  TeamMemberResponseDto,
} from "@st-manager/contracts";
import { CrownIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AccessDenied } from "@/components/roles/AccessDenied";
import { EditMemberDialog } from "@/components/settings/EditMemberDialog";
import { InviteMemberDialog } from "@/components/settings/InviteMemberDialog";
import { SettingsTeamNav } from "@/components/settings/SettingsTeamNav";
import { TransferOwnershipDialog } from "@/components/settings/TransferOwnershipDialog";
import {
  MobileDataCard,
  MobileDataField,
  ResponsiveDataView,
} from "@/components/ui/ResponsiveDataView";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { teamMembersApi } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  formatLastLogin,
  formatMemberStatus,
  memberInitials,
} from "@/lib/team/constants";

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "active") {
    return "default";
  }
  if (status === "pending") {
    return "secondary";
  }
  return "outline";
}

type ConfirmState =
  | { type: "disable"; member: TeamMemberResponseDto }
  | { type: "remove"; member: TeamMemberResponseDto }
  | { type: "enable"; member: TeamMemberResponseDto }
  | { type: "cancel"; invitation: PendingInvitationResponseDto };

export function TeamMembersPageClient() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const { canAccessTeamManagement, canManageTeam } = usePermissions();
  const [members, setMembers] = useState<TeamMemberListItemDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberResponseDto | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmState | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isOwner = canManageTeam();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const memberResponse = await teamMembersApi.listMembers();
      setMembers(memberResponse.data);

      if (isOwner) {
        const permissionResponse = await teamMembersApi.listPermissions();
        setPermissions(permissionResponse);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load team members"));
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (isAuthenticated && canAccessTeamManagement()) {
      void loadData();
    }
  }, [isAuthenticated, canAccessTeamManagement, loadData]);

  const activeMembers = useMemo(
    () => members.filter((item): item is TeamMemberResponseDto => item.type === "member"),
    [members],
  );

  async function handleInvite(values: Parameters<typeof teamMembersApi.inviteMember>[0]) {
    try {
      await teamMembersApi.inviteMember(values);
      toast.success("Invitation sent");
      await loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send invitation"));
      throw error;
    }
  }

  async function handleEdit(values: Parameters<typeof teamMembersApi.updateMember>[1]) {
    if (!editingMember) {
      return;
    }
    try {
      await teamMembersApi.updateMember(editingMember.id, values);
      toast.success("Member updated");
      await loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update member"));
      throw error;
    }
  }

  async function handleTransfer(newOwnerUserId: string) {
    await teamMembersApi.transferOwnership({ newOwnerUserId });
    toast.success("Ownership transferred. Please sign in again.");
    logout();
    router.replace("/login");
  }

  async function handleResendInvitation(invitationId: string) {
    setActionLoadingId(invitationId);
    try {
      await teamMembersApi.resendInvitation(invitationId);
      toast.success("Invitation resent");
      await loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to resend invitation"));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) {
      return;
    }

    try {
      if (confirmAction.type === "disable") {
        await teamMembersApi.disableMember(confirmAction.member.id);
        toast.success("Member disabled");
      } else if (confirmAction.type === "enable") {
        await teamMembersApi.enableMember(confirmAction.member.id);
        toast.success("Member enabled");
      } else if (confirmAction.type === "remove") {
        await teamMembersApi.removeMember(confirmAction.member.id);
        toast.success("Member removed");
      } else {
        await teamMembersApi.cancelInvitation(confirmAction.invitation.id);
        toast.success("Invitation cancelled");
      }
      setConfirmAction(null);
      await loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Action failed"));
    }
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to access team management.</p>
        </CardContent>
      </Card>
    );
  }

  if (!canAccessTeamManagement()) {
    return <AccessDenied message="You do not have permission to view team management." />;
  }

  function renderInvitationActions(item: PendingInvitationResponseDto) {
    if (!isOwner) {
      return <span className="text-sm text-muted-foreground">Pending invitation</span>;
    }

    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={actionLoadingId === item.id}
          onClick={() => void handleResendInvitation(item.id)}
        >
          Resend
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => setConfirmAction({ type: "cancel", invitation: item })}
        >
          Cancel
        </Button>
      </div>
    );
  }

  function renderMemberActions(item: TeamMemberResponseDto) {
    if (!isOwner) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    const isSelf = item.id === user?.id;
    const isOwnerMember = item.role === "owner";

    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingMember(item);
            setEditOpen(true);
          }}
        >
          Edit
        </Button>
        {!isSelf && !isOwnerMember ? (
          <>
            {item.status === "disabled" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction({ type: "enable", member: item })}
              >
                Enable
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction({ type: "disable", member: item })}
              >
                Disable
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setConfirmAction({ type: "remove", member: item })}
            >
              Remove
            </Button>
          </>
        ) : null}
      </div>
    );
  }

  function renderActions(item: TeamMemberListItemDto) {
    if (item.type === "invitation") {
      return renderInvitationActions(item);
    }
    return renderMemberActions(item);
  }

  const confirmTitle = (() => {
    if (!confirmAction) {
      return "";
    }
    switch (confirmAction.type) {
      case "disable":
        return "Disable member?";
      case "enable":
        return "Enable member?";
      case "remove":
        return "Remove member?";
      case "cancel":
        return "Cancel invitation?";
    }
  })();

  const confirmDescription = (() => {
    if (!confirmAction) {
      return "";
    }
    switch (confirmAction.type) {
      case "disable":
        return `${confirmAction.member.fullName ?? confirmAction.member.email} will lose access until re-enabled.`;
      case "enable":
        return `${confirmAction.member.fullName ?? confirmAction.member.email} will regain access to the studio.`;
      case "remove":
        return `${confirmAction.member.fullName ?? confirmAction.member.email} will be permanently removed from your studio.`;
      case "cancel":
        return `The invitation for ${confirmAction.invitation.email} will be cancelled.`;
    }
  })();

  return (
    <div className="page-container flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          {canManageTeam() ? (
            <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
              Back to settings
            </Link>
          ) : null}
          <h1 className="page-title mt-2">Team Management</h1>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "Invite team members, manage roles, and control workspace access."
              : "View your studio team members and pending invitations."}
          </p>
        </div>

        <SettingsTeamNav />

        {isOwner ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setTransferOpen(true)}>
              <CrownIcon className="mr-2 h-4 w-4" />
              Transfer Ownership
            </Button>
            <Button type="button" onClick={() => setInviteOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </div>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading team members…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "No team members yet. Invite your first member."
                : "No team members found."}
            </p>
          ) : (
            <ResponsiveDataView
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      {isOwner ? <TableHead className="text-right">Actions</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((item) => (
                      <TableRow key={`${item.type}-${item.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {memberInitials(item.fullName, item.email)}
                            </div>
                            <span>{item.fullName || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.email}</TableCell>
                        <TableCell>
                          {TEAM_ROLE_LABELS[item.role as keyof typeof TEAM_ROLE_LABELS] ?? item.role}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(item.status)}>
                            {formatMemberStatus(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.type === "member" ? formatLastLogin(item.lastLoginAt) : "—"}
                        </TableCell>
                        {isOwner ? (
                          <TableCell className="text-right">{renderActions(item)}</TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
              mobile={members.map((item) => (
                <MobileDataCard
                  key={`${item.type}-${item.id}`}
                  title={item.fullName || item.email}
                  subtitle={item.email}
                  actions={
                    <Badge variant={statusVariant(item.status)}>
                      {formatMemberStatus(item.status)}
                    </Badge>
                  }
                >
                  <MobileDataField
                    label="Role"
                    value={TEAM_ROLE_LABELS[item.role as keyof typeof TEAM_ROLE_LABELS] ?? item.role}
                  />
                  {item.type === "member" ? (
                    <MobileDataField label="Last Login" value={formatLastLogin(item.lastLoginAt)} />
                  ) : (
                    <MobileDataField
                      label="Expires"
                      value={new Date(item.expiresAt).toLocaleDateString()}
                    />
                  )}
                  {isOwner ? <div className="col-span-2 pt-2">{renderActions(item)}</div> : null}
                </MobileDataCard>
              ))}
            />
          )}
        </CardContent>
      </Card>

      {isOwner ? (
        <>
          <InviteMemberDialog
            open={inviteOpen}
            permissions={permissions}
            onOpenChange={setInviteOpen}
            onSubmit={handleInvite}
          />

          <EditMemberDialog
            open={editOpen}
            member={editingMember}
            permissions={permissions}
            onOpenChange={setEditOpen}
            onSubmit={handleEdit}
          />

          <TransferOwnershipDialog
            open={transferOpen}
            members={activeMembers}
            currentUserId={user?.id}
            onOpenChange={setTransferOpen}
            onConfirm={handleTransfer}
          />
        </>
      ) : null}

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={
                confirmAction?.type === "remove" || confirmAction?.type === "cancel"
                  ? "destructive"
                  : "default"
              }
              onClick={() => void handleConfirmAction()}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
