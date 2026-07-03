import { ApiError } from "@st-manager/api-sdk";

type ValidationDetail = {
  path?: string;
  message?: string;
};

function isValidationDetail(value: unknown): value is ValidationDetail {
  return typeof value === "object" && value !== null && "message" in value;
}

/** Prefer field-level validation messages over generic API error text. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  if (Array.isArray(error.details) && error.details.length > 0) {
    const messages = error.details
      .filter(isValidationDetail)
      .map((detail) => {
        const message = detail.message?.trim();
        if (!message) {
          return null;
        }

        const path = detail.path?.trim();
        return path ? `${path}: ${message}` : message;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) {
      return messages.join(". ");
    }
  }

  return error.message || fallback;
}
