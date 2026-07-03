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
