export { createStudioSchema } from "./studio/studio.schema";
export type { CreateStudioInput } from "./studio/studio.schema";

export { listStudiosQuerySchema } from "./studio/list-studios-query.schema";
export type { ListStudiosQueryInput } from "./studio/list-studios-query.schema";

export { apiEnvSchema } from "./env/api-env.schema";
export type { ApiEnv } from "./env/api-env.schema";

export { loginSchema } from "./auth/login.schema";
export type { LoginInput } from "./auth/login.schema";

export { registerSchema } from "./auth/register.schema";
export type { RegisterInput } from "./auth/register.schema";

export { refreshSchema } from "./auth/refresh.schema";
export type { RefreshInput } from "./auth/refresh.schema";

export { forgotPasswordSchema, resetPasswordSchema } from "./auth/forgot-password.schema";
export type { ForgotPasswordInput, ResetPasswordInput } from "./auth/forgot-password.schema";

export { syncStudiosPushSchema } from "./sync/sync-studios-push.schema";
export type { SyncStudiosPushInput } from "./sync/sync-studios-push.schema";

export { syncStudiosPullQuerySchema } from "./sync/sync-studios-pull.schema";
export type { SyncStudiosPullQueryInput } from "./sync/sync-studios-pull.schema";

export { generateStudioSummarySchema } from "./ai/studio-summary.schema";
export type { GenerateStudioSummaryInput } from "./ai/studio-summary.schema";

export {
  createClientSchema,
  updateClientSchema,
} from "./client/client.schema";
export type { CreateClientInput, UpdateClientInput } from "./client/client.schema";
export {
  normalizeOptionalApiString,
  serializeClientRequestBody,
} from "./client/normalize-client-fields";

export { listClientsQuerySchema } from "./client/list-clients-query.schema";
export type { ListClientsQueryInput } from "./client/list-clients-query.schema";

export { syncClientsPullQuerySchema } from "./client/sync-clients-pull-query.schema";
export type { SyncClientsPullQueryInput } from "./client/sync-clients-pull-query.schema";

export {
  createProjectSchema,
  updateProjectSchema,
} from "./project/project.schema";
export type { CreateProjectInput, UpdateProjectInput } from "./project/project.schema";
export { serializeProjectRequestBody } from "./project/normalize-project-fields";

export { listProjectsQuerySchema } from "./project/list-projects-query.schema";
export type { ListProjectsQueryInput } from "./project/list-projects-query.schema";

export { syncProjectsPullQuerySchema } from "./project/sync-projects-pull-query.schema";
export type { SyncProjectsPullQueryInput } from "./project/sync-projects-pull-query.schema";

export {
  createBookingSchema,
  updateBookingSchema,
  listBookingsQuerySchema,
} from "./booking/booking.schema";
export type {
  CreateBookingInput,
  UpdateBookingInput,
  ListBookingsQueryInput,
} from "./booking/booking.schema";

export {
  createSessionSchema,
  updateSessionSchema,
  listSessionsQuerySchema,
} from "./session/session.schema";
export type {
  CreateSessionInput,
  UpdateSessionInput,
  ListSessionsQueryInput,
} from "./session/session.schema";

export {
  createInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesQuerySchema,
  computeInvoiceTotals,
} from "./invoice/invoice.schema";
export type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesQueryInput,
} from "./invoice/invoice.schema";

export { reportsDateRangeQuerySchema } from "./reports/reports.schema";
export type { ReportsDateRangeQueryInput } from "./reports/reports.schema";

export {
  inviteTeamMemberSchema,
  updateTeamMemberSchema,
  acceptInvitationSchema,
  transferOwnershipSchema,
} from "./team/team.schema";
export type {
  InviteTeamMemberInput,
  UpdateTeamMemberInput,
  AcceptInvitationInput,
  TransferOwnershipInput,
} from "./team/team.schema";

export {
  platformStudioListQuerySchema,
  platformDeleteStudioSchema,
  platformUpdateProfileSchema,
  platformPermanentDeleteStudioSchema,
  platformActivationCodeListQuerySchema,
  platformGenerateActivationCodesSchema,
  platformDeleteActivationCodeSchema,
  platformLicenseListQuerySchema,
  platformGenerateLicensesSchema,
  platformDeleteLicenseSchema,
} from "./platform-admin/platform-admin.schema";
export type {
  PlatformStudioListQueryInput,
  PlatformDeleteStudioInput,
  PlatformUpdateProfileInput,
  PlatformPermanentDeleteStudioInput,
  PlatformActivationCodeListQueryInput,
  PlatformGenerateActivationCodesInput,
  PlatformDeleteActivationCodeInput,
  PlatformLicenseListQueryInput,
  PlatformGenerateLicensesInput,
  PlatformDeleteLicenseInput,
} from "./platform-admin/platform-admin.schema";

export { updateStudioUserProfileSchema } from "./profile/studio-profile.schema";
export type { UpdateStudioUserProfileInput } from "./profile/studio-profile.schema";

export {
  clientPortalSnapshotSchema,
  clientPortalCreateOrSyncSchema,
  clientPortalEmailSchema,
} from "./client-portal/client-portal.schema";
export type {
  ClientPortalSnapshotInput,
  ClientPortalCreateOrSyncInput,
  ClientPortalEmailInput,
} from "./client-portal/client-portal.schema";
