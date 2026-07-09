import { INVITABLE_TEAM_ROLES, TEAM_ROLES } from "@st-manager/constants";
import { z } from "zod";

const invitationPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

const teamRoleSchema = z.enum([
  TEAM_ROLES.OWNER,
  TEAM_ROLES.MANAGER,
  TEAM_ROLES.ENGINEER,
  TEAM_ROLES.ASSISTANT,
  TEAM_ROLES.RECEPTION,
  TEAM_ROLES.ACCOUNTANT,
]);

const invitableRoleSchema = z.enum([
  TEAM_ROLES.MANAGER,
  TEAM_ROLES.ENGINEER,
  TEAM_ROLES.ASSISTANT,
  TEAM_ROLES.RECEPTION,
  TEAM_ROLES.ACCOUNTANT,
]);

export const inviteTeamMemberSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().max(64).optional(),
  role: invitableRoleSchema,
  customPermissions: z.array(z.string().trim().min(1)).optional(),
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;

export const updateTeamMemberSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(64).optional().nullable(),
  role: teamRoleSchema.optional(),
  customPermissions: z.array(z.string().trim().min(1)).optional().nullable(),
});

export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

export const acceptInvitationSchema = z
  .object({
    password: invitationPasswordSchema,
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const transferOwnershipSchema = z.object({
  newOwnerUserId: z.string().trim().min(1, "New owner is required"),
});

export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

export { INVITABLE_TEAM_ROLES };
