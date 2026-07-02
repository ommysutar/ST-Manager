import type { ApiSuccessResponseDto } from "../common/success-response.dto";
import type { StudioResponseDto } from "./studio-response.dto";

/**
 * Response envelope for `POST /studios` — `StudioResponseDto` wrapped in the
 * standard `{ success, data }` shape (M5 decision: "standardize API
 * responses"). `packages/api-sdk`'s `createStudio` unwraps this back down to
 * a plain `StudioResponseDto` for callers, so the envelope never leaks past
 * the SDK boundary.
 */
export type CreateStudioResponseDto = ApiSuccessResponseDto<StudioResponseDto>;
