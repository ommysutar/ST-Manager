import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, Logger } from "@nestjs/common";
import { API_ERROR_CODES, type ApiErrorCode } from "@st-manager/constants";
import type { ApiErrorResponseDto } from "@st-manager/contracts";

/**
 * Minimal structural shapes for the Express request/response objects Nest
 * hands this filter. Deliberately not importing `express`'s own types —
 * `express` ships no bundled `.d.ts` and this project has no `@types/express`
 * dependency; these two methods/fields are all this filter needs.
 */
interface MinimalRequest {
  url: string;
}
interface MinimalResponse {
  status(code: number): { json(body: ApiErrorResponseDto): void };
}

/** Shape `ZodValidationPipe` (and any other `BadRequestException`) may attach as its response body. */
interface StructuredExceptionResponse {
  message?: string;
  details?: unknown;
}

function mapStatusToErrorCode(statusCode: number): ApiErrorCode {
  if (statusCode === 400) {
    return API_ERROR_CODES.VALIDATION_ERROR;
  }
  if (statusCode === 404) {
    return API_ERROR_CODES.NOT_FOUND;
  }
  if (statusCode === 401) {
    return API_ERROR_CODES.UNAUTHORIZED;
  }
  if (statusCode === 503) {
    return API_ERROR_CODES.AI_PROVIDER_ERROR;
  }
  return API_ERROR_CODES.INTERNAL_ERROR;
}

function isStructuredExceptionResponse(value: unknown): value is StructuredExceptionResponse {
  return typeof value === "object" && value !== null;
}

/**
 * Global, catch-all exception filter — `@Catch()` with no argument, so it
 * handles every thrown value, not just `HttpException` subclasses. This is
 * what guarantees *every* `apps/api` error response (validation failures,
 * not-found, and genuinely unexpected bugs alike) comes back as the same
 * `ApiErrorResponseDto` shape (M5 decision: "standardize API responses"),
 * rather than only the errors someone thought to handle explicitly.
 *
 * Registered via the `APP_FILTER` DI token in `AppModule` (not
 * `app.useGlobalFilters()` in `main.ts`) so it stays swappable/injectable.
 * Server-side logging uses `@nestjs/common`'s `Logger`, which is routed
 * through `StManagerNestLoggerService` via `app.useLogger()` (M9).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<MinimalResponse>();
    const request = ctx.getRequest<MinimalRequest>();

    const statusCode = exception instanceof HttpException ? exception.getStatus() : 500;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const structured = isStructuredExceptionResponse(exceptionResponse)
      ? exceptionResponse
      : undefined;

    const body: ApiErrorResponseDto = {
      success: false,
      statusCode,
      error: mapStatusToErrorCode(statusCode),
      message: this.resolveMessage(exception, structured),
      details: structured?.details,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      // Full detail server-side only — emitted as structured JSON via M9 logging.
      this.logger.error(exception instanceof Error ? exception.stack : exception);
      body.message = "Internal server error"; // never leak internals to the client
    }

    response.status(statusCode).json(body);
  }

  private resolveMessage(exception: unknown, structured?: StructuredExceptionResponse): string {
    if (structured?.message) {
      return structured.message;
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return "Internal server error";
  }
}
