export type { ApiSuccessResponseDto } from "./common/success-response.dto";
export type { PaginationMetaDto, PaginatedResponseDto } from "./common/pagination.dto";
export type { ApiErrorResponseDto } from "./common/error-response.dto";

export type { CreateStudioDto } from "./studio/create-studio.dto";
export type { CreateStudioResponseDto } from "./studio/create-studio-response.dto";
export type { StudioResponseDto } from "./studio/studio-response.dto";
export type { ListStudiosQueryDto, ListStudiosResponseDto } from "./studio/list-studios.dto";

export type { AuthUserDto } from "./auth/auth-user.dto";
export type { LoginRequestDto, LoginResponseDataDto, LoginResponseDto } from "./auth/login.dto";
export type {
  RegisterRequestDto,
  RegisterResponseDataDto,
  RegisterResponseDto,
} from "./auth/register.dto";
export type { RefreshRequestDto, RefreshResponseDataDto, RefreshResponseDto } from "./auth/refresh.dto";

export type {
  SyncStudiosPushItemDto,
  SyncStudiosPushRequestDto,
  SyncStudiosPushResultDto,
  SyncStudiosPushResultStatus,
  SyncStudiosPushResponseDataDto,
  SyncStudiosPushResponseDto,
} from "./sync/sync-studios-push.dto";
export type {
  SyncStudiosPullQueryDto,
  SyncStudiosPullResponseDataDto,
  SyncStudiosPullResponseDto,
} from "./sync/sync-studios-pull.dto";

export type {
  GenerateStudioSummaryRequestDto,
  GenerateStudioSummaryResponseDataDto,
  GenerateStudioSummaryResponseDto,
} from "./ai/studio-summary.dto";

export type { ClientResponseDto } from "./client/client-response.dto";
export type { CreateClientDto } from "./client/create-client.dto";
export type { UpdateClientDto } from "./client/update-client.dto";
export type {
  CreateClientResponseDto,
  DeleteClientResponseDto,
  GetClientResponseDto,
  ListClientsQueryDto,
  ListClientsResponseDto,
  UpdateClientResponseDto,
} from "./client/list-clients.dto";

export type { BookingResponseDto } from "./booking/booking-response.dto";
export type { CreateBookingDto } from "./booking/create-booking.dto";
export type { UpdateBookingDto } from "./booking/update-booking.dto";
export type {
  CancelBookingResponseDto,
  CreateBookingResponseDto,
  GetBookingResponseDto,
  ListBookingsQueryDto,
  ListBookingsResponseDto,
  UpdateBookingResponseDto,
} from "./booking/list-bookings.dto";

export type { SessionResponseDto } from "./session/session-response.dto";
export type { CreateSessionDto, CreateSessionResponseDto } from "./session/create-session.dto";
export type { UpdateSessionDto } from "./session/list-sessions.dto";
export type {
  CancelSessionResponseDto,
  CompleteSessionResponseDto,
  GetSessionResponseDto,
  ListSessionsQueryDto,
  ListSessionsResponseDto,
  StartSessionResponseDto,
  UpdateSessionResponseDto,
} from "./session/list-sessions.dto";

export type { DashboardRevenueTrendPointDto } from "./dashboard/dashboard-revenue-trend.dto";
export type { DashboardBookingSummaryDto } from "./dashboard/dashboard-booking-summary.dto";
export type { DashboardClientSummaryDto } from "./dashboard/dashboard-client-summary.dto";
export type { DashboardSessionSummaryDto } from "./dashboard/dashboard-session-summary.dto";
export type { DashboardInvoiceSummaryDto } from "./dashboard/dashboard-invoice-summary.dto";
export type {
  DashboardSummaryDataDto,
  DashboardSummaryResponseDto,
} from "./dashboard/dashboard-summary.dto";

export type { InvoiceResponseDto } from "./invoice/invoice-response.dto";
export type { CreateInvoiceDto, CreateInvoiceResponseDto } from "./invoice/create-invoice.dto";
export type { UpdateInvoiceDto } from "./invoice/list-invoices.dto";
export type {
  GetInvoiceResponseDto,
  ListInvoicesQueryDto,
  ListInvoicesResponseDto,
  MarkInvoicePaidResponseDto,
  SendInvoiceResponseDto,
  UpdateInvoiceResponseDto,
  VoidInvoiceResponseDto,
} from "./invoice/list-invoices.dto";

export type { ReportsDateRangeQueryDto } from "./reports/reports-query.dto";
export type {
  RevenueDailyBreakdownDto,
  RevenueReportDataDto,
  RevenueReportResponseDto,
} from "./reports/revenue-report.dto";
export type {
  UtilizationReportDataDto,
  UtilizationReportResponseDto,
  UtilizationStudioBreakdownDto,
} from "./reports/utilization-report.dto";
export type {
  ClientActivityReportDataDto,
  ClientActivityReportResponseDto,
  ClientActivityRowDto,
} from "./reports/client-activity-report.dto";

export type {
  TeamMemberResponseDto,
  PendingInvitationResponseDto,
  TeamMemberListItemDto,
  ListTeamMembersResponseDto,
  InviteTeamMemberRequestDto,
  InviteTeamMemberResponseDto,
  UpdateTeamMemberRequestDto,
  UpdateTeamMemberResponseDto,
  DisableTeamMemberResponseDto,
  EnableTeamMemberResponseDto,
  RemoveTeamMemberResponseDto,
  ResendInvitationResponseDto,
  CancelInvitationResponseDto,
  TransferOwnershipRequestDto,
  TransferOwnershipResponseDto,
} from "./team/team-member.dto";
export type {
  InvitationPreviewDto,
  VerifyInvitationResponseDto,
  AcceptInvitationRequestDto,
  AcceptInvitationResponseDto,
  AcceptInvitationResultDto,
  CompleteInvitationResponseDto,
} from "./team/invitation.dto";
export type {
  PermissionResponseDto,
  RoleDefinitionResponseDto,
  ListPermissionsResponseDto,
  ListRolesResponseDto,
} from "./team/permissions.dto";

export type {
  PlatformAdminLoginRequestDto,
  PlatformAdminLoginResponseDataDto,
  PlatformAdminLoginResponseDto,
  PlatformAdminDashboardDto,
  PlatformAdminDashboardResponseDto,
  PlatformAdminProfileDto,
  PlatformAdminProfileResponseDto,
  PlatformUpdateProfileRequestDto,
  PlatformStudioListItemDto,
  PlatformStudioListQueryDto,
  PlatformStudioListResponseDto,
  PlatformStudioMemberDto,
  PlatformStudioLicenseInfoDto,
  PlatformStudioDetailDto,
  PlatformStudioDetailResponseDto,
  PlatformStudioActionResponseDto,
  PlatformDeleteStudioRequestDto,
  PlatformPermanentDeleteStudioRequestDto,
  PlatformPermanentDeleteStudioResponseDto,
  PlatformAuditLogDto,
  PlatformAuditLogListResponseDto,
  PlatformActivationCodeDto,
  PlatformActivationCodeSummaryDto,
  PlatformActivationCodeListQueryDto,
  PlatformActivationCodeListResponseDto,
  PlatformGenerateActivationCodesRequestDto,
  PlatformGenerateActivationCodesResponseDto,
  PlatformActivationCodeActionResponseDto,
  PlatformDeleteActivationCodeRequestDto,
  PlatformActivationCodesExportResponseDto,
  PlatformLicenseDto,
  PlatformLicenseSummaryDto,
  PlatformLicenseListQueryDto,
  PlatformLicenseListResponseDto,
  PlatformGenerateLicensesRequestDto,
  PlatformGenerateLicensesResponseDto,
  PlatformLicenseActionResponseDto,
  PlatformDeleteLicenseRequestDto,
  PlatformLicensesExportResponseDto,
  StudioLicenseDto,
  StudioLicenseResponseDto,
} from "./platform-admin/platform-admin.dto";

export type {
  StudioUserProfileDto,
  UpdateStudioUserProfileRequestDto,
  GetStudioUserProfileResponseDto,
  UpdateStudioUserProfileResponseDto,
} from "./profile/studio-profile.dto";

export type {
  ClientPortalStudioDto,
  ClientPortalTimelineStepDto,
  ClientPortalBookingDto,
  ClientPortalPaymentDto,
  ClientPortalDocumentDto,
  ClientPortalEstimateDto,
  ClientPortalFileDto,
  ClientPortalSnapshotDto,
  ClientPortalLinkMetaDto,
  ClientPortalCreateOrSyncRequestDto,
  ClientPortalCreateResponseDto,
  ClientPortalMetaResponseDto,
  ClientPortalAccessResponseDto,
  ClientPortalEmailRequestDto,
} from "./client-portal/client-portal.dto";
