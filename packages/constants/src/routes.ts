/**
 * Named API resource route keys (not full URL paths), used to keep the API,
 * api-sdk, and contracts packages referring to the same resource names.
 */
export const ROUTES = {
  AUTH: "auth",
  STUDIOS: "studios",
  SYNC: "sync",
} as const;

export type RouteKey = (typeof ROUTES)[keyof typeof ROUTES];
