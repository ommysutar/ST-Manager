export type { ApiSuccessResponseDto } from "./common/success-response.dto";
export type { PaginationMetaDto, PaginatedResponseDto } from "./common/pagination.dto";
export type { ApiErrorResponseDto } from "./common/error-response.dto";

export type { CreateStudioDto } from "./studio/create-studio.dto";
export type { CreateStudioResponseDto } from "./studio/create-studio-response.dto";
export type { StudioResponseDto } from "./studio/studio-response.dto";
export type { ListStudiosQueryDto, ListStudiosResponseDto } from "./studio/list-studios.dto";

export type { AuthUserDto } from "./auth/auth-user.dto";
export type { LoginRequestDto, LoginResponseDataDto, LoginResponseDto } from "./auth/login.dto";
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

export type { DashboardBookingSummaryDto } from "./dashboard/dashboard-booking-summary.dto";
export type {
  DashboardSummaryDataDto,
  DashboardSummaryResponseDto,
} from "./dashboard/dashboard-summary.dto";
