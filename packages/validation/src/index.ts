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
  createInquirySchema,
  updateInquirySchema,
} from "./inquiry/inquiry.schema";
export type { CreateInquiryInput, UpdateInquiryInput } from "./inquiry/inquiry.schema";
export { serializeInquiryRequestBody } from "./inquiry/normalize-inquiry-fields";

export { listInquiriesQuerySchema } from "./inquiry/list-inquiries-query.schema";
export type { ListInquiriesQueryInput } from "./inquiry/list-inquiries-query.schema";

export { syncInquiriesPullQuerySchema } from "./inquiry/sync-inquiries-pull-query.schema";
export type { SyncInquiriesPullQueryInput } from "./inquiry/sync-inquiries-pull-query.schema";

export {
  createProjectBookingSchema,
  updateProjectBookingSchema,
} from "./project-booking/project-booking.schema";
export type {
  CreateProjectBookingInput,
  UpdateProjectBookingInput,
} from "./project-booking/project-booking.schema";
export { serializeProjectBookingRequestBody } from "./project-booking/normalize-project-booking-fields";

export { listProjectBookingsQuerySchema } from "./project-booking/list-project-bookings-query.schema";
export type { ListProjectBookingsQueryInput } from "./project-booking/list-project-bookings-query.schema";

export { syncProjectBookingsPullQuerySchema } from "./project-booking/sync-project-bookings-pull-query.schema";
export type { SyncProjectBookingsPullQueryInput } from "./project-booking/sync-project-bookings-pull-query.schema";

export { createPaymentSchema, updatePaymentSchema } from "./payment/payment.schema";
export type { CreatePaymentInput, UpdatePaymentInput } from "./payment/payment.schema";

export { listPaymentsQuerySchema } from "./payment/list-payments-query.schema";
export type { ListPaymentsQueryInput } from "./payment/list-payments-query.schema";

export { syncPaymentsPullQuerySchema } from "./payment/sync-payments-pull-query.schema";
export type { SyncPaymentsPullQueryInput } from "./payment/sync-payments-pull-query.schema";

export {
  createStudioDocumentSchema,
  updateStudioDocumentSchema,
} from "./studio-document/studio-document.schema";
export type {
  CreateStudioDocumentInput,
  UpdateStudioDocumentInput,
} from "./studio-document/studio-document.schema";
export { serializeStudioDocumentRequestBody } from "./studio-document/normalize-studio-document-fields";

export { listStudioDocumentsQuerySchema } from "./studio-document/list-studio-documents-query.schema";
export type { ListStudioDocumentsQueryInput } from "./studio-document/list-studio-documents-query.schema";

export { syncStudioDocumentsPullQuerySchema } from "./studio-document/sync-studio-documents-pull-query.schema";
export type { SyncStudioDocumentsPullQueryInput } from "./studio-document/sync-studio-documents-pull-query.schema";

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

export {
  createStudioServiceSchema,
  updateStudioServiceSchema,
} from "./studio-service/studio-service.schema";
export type {
  CreateStudioServiceInput,
  UpdateStudioServiceInput,
} from "./studio-service/studio-service.schema";
export { serializeStudioServiceRequestBody } from "./studio-service/normalize-studio-service-fields";

export { listStudioServicesQuerySchema } from "./studio-service/list-studio-services-query.schema";
export type { ListStudioServicesQueryInput } from "./studio-service/list-studio-services-query.schema";

export { syncStudioServicesPullQuerySchema } from "./studio-service/sync-studio-services-pull-query.schema";
export type { SyncStudioServicesPullQueryInput } from "./studio-service/sync-studio-services-pull-query.schema";

export { createStudioRoomSchema, updateStudioRoomSchema } from "./studio-room/studio-room.schema";
export type { CreateStudioRoomInput, UpdateStudioRoomInput } from "./studio-room/studio-room.schema";
export { serializeStudioRoomRequestBody } from "./studio-room/normalize-studio-room-fields";

export { listStudioRoomsQuerySchema } from "./studio-room/list-studio-rooms-query.schema";
export type { ListStudioRoomsQueryInput } from "./studio-room/list-studio-rooms-query.schema";

export { syncStudioRoomsPullQuerySchema } from "./studio-room/sync-studio-rooms-pull-query.schema";
export type { SyncStudioRoomsPullQueryInput } from "./studio-room/sync-studio-rooms-pull-query.schema";

export {
  createBookingSlotDefinitionSchema,
  updateBookingSlotDefinitionSchema,
} from "./booking-slot-definition/booking-slot-definition.schema";
export type {
  CreateBookingSlotDefinitionInput,
  UpdateBookingSlotDefinitionInput,
} from "./booking-slot-definition/booking-slot-definition.schema";

export { listBookingSlotDefinitionsQuerySchema } from "./booking-slot-definition/list-booking-slot-definitions-query.schema";
export type { ListBookingSlotDefinitionsQueryInput } from "./booking-slot-definition/list-booking-slot-definitions-query.schema";

export { syncBookingSlotDefinitionsPullQuerySchema } from "./booking-slot-definition/sync-booking-slot-definitions-pull-query.schema";
export type { SyncBookingSlotDefinitionsPullQueryInput } from "./booking-slot-definition/sync-booking-slot-definitions-pull-query.schema";

export { updateStudioSettingsSchema } from "./studio-settings/studio-settings.schema";
export type { UpdateStudioSettingsInput } from "./studio-settings/studio-settings.schema";

export { syncStudioSettingsPullQuerySchema } from "./studio-settings/sync-studio-settings-pull-query.schema";
export type { SyncStudioSettingsPullQueryInput } from "./studio-settings/sync-studio-settings-pull-query.schema";
