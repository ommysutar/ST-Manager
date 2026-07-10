export { createHttpClient } from "./client/http-client";
export { ApiError } from "./client/api-error";
export type { ApiClientConfig, HttpClient, QueryParams } from "./client/types";

export { createStudiosApi } from "./studios/studios.api";
export type { StudiosApi } from "./studios/studios.api";

export { createAuthApi } from "./auth/auth.api";
export type { AuthApi } from "./auth/auth.api";

export { createSyncApi } from "./sync/sync.api";
export type { SyncApi } from "./sync/sync.api";

export { createAiApi } from "./ai/ai.api";
export type { AiApi } from "./ai/ai.api";

export { createDashboardApi } from "./dashboard/dashboard.api";
export type { DashboardApi } from "./dashboard/dashboard.api";

export { createClientsApi } from "./clients/clients.api";
export type { ClientsApi } from "./clients/clients.api";

export { createBookingsApi } from "./bookings/bookings.api";
export type { BookingsApi } from "./bookings/bookings.api";

export { createSessionsApi } from "./sessions/sessions.api";
export type { SessionsApi } from "./sessions/sessions.api";

export { createInvoicesApi } from "./invoices/invoices.api";
export type { InvoicesApi } from "./invoices/invoices.api";

export { createReportsApi } from "./reports/reports.api";
export type { ReportsApi } from "./reports/reports.api";

export { createTeamMembersApi } from "./team-members/team-members.api";
export type { TeamMembersApi } from "./team-members/team-members.api";

export { createPlatformAdminApi } from "./platform-admin/platform-admin.api";
export type { PlatformAdminApi } from "./platform-admin/platform-admin.api";
