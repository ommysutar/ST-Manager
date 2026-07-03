# ADR 0002: Authentication Provider

- Status: **Accepted — Custom JWT (access + refresh tokens)**
- Date: 2026-07-02 (deferred); updated 2026-07-03 (M10 decision)

## Context

The frozen v3 architecture explicitly leaves the authentication provider as "TBD," with the following boundary reserved so implementation can proceed elsewhere without blocking on this decision:

| Layer | Auth touchpoint |
|-------|-----------------|
| `apps/api/src/modules/auth/` | Provider adapter + session/JWT issuance |
| `packages/api-sdk/client/` | Token injection, refresh hook (no provider logic) |
| `packages/contracts/auth/` | Login, refresh, session DTO shapes |
| `packages/validation/auth/` | Request/response parsers |

Candidate options for the eventual decision included a custom JWT implementation (full control, no external dependency, more implementation work), and managed providers such as Clerk or Auth0 (faster to implement, external dependency and cost, potential vendor lock-in).

## Decision

**M10 adopts custom JWT authentication** implemented in `apps/api` using `@nestjs/jwt` and `passport-jwt`, with bcrypt password verification against a `User` row in the database.

| Aspect | Choice |
|---|---|
| Transport | `Authorization: Bearer <accessToken>` on protected routes |
| Access token | JWT, default `15m` (`JWT_ACCESS_EXPIRES_IN`) |
| Refresh token | JWT, default `7d` (`JWT_REFRESH_EXPIRES_IN`), exchanged via `POST /auth/refresh` |
| Password hashing | bcrypt (cost factor 10) |
| Dev user | Seeded `dev@st-manager.local` / `devpassword` (see `packages/database/scripts/seed-dev-user.ts`) |
| Protected routes (M10) | `POST /studios` only; `GET /studios` remains public |
| Client token storage | `localStorage` in desktop/web app layers; `packages/api-sdk` injects headers only |

Managed providers (Clerk, Auth0) are deferred — they can replace the `apps/api/src/modules/auth/` adapter later without changing client DTO contracts if the same login/refresh response shapes are preserved.

## Consequences

- ADR 0002 is no longer deferred; M10 implements the first real auth slice.
- `packages/contracts/src/auth/` and `packages/validation/src/auth/` are populated with login/refresh DTOs and schemas.
- `packages/api-sdk` implements `createAuthApi`, `getAuthHeaders`, and a single automatic retry on `401 UNAUTHORIZED` via `onUnauthorized`.
- Refresh tokens are **stateless** in M10 — no server-side revocation table. Acceptable for the minimal milestone; session revocation is a future hardening item (M11+).
- `AUTH_SECRET` is required in all API environments (`packages/validation` `apiEnvSchema`).
