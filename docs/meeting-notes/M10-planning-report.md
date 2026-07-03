# M10 Planning Report — Auth Decision and Minimal Implementation

- Date: 2026-07-03
- Milestone: M10 (Auth Decision and Minimal Implementation)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), [docs/roadmap/milestones.md](../roadmap/milestones.md), [ADR 0002](../system-architecture/adr/0002-authentication-provider.md), M4/M5/M7/M8/M9 planning and implementation reports
- Status: **Planning only — no application code, dependencies, scaffolding commands, or commits have been generated.** Awaiting approval before implementation.

**Note on source documents:** `roadmap/milestones/M10.md` does not exist in this repository. M10 scope is taken verbatim from `docs/roadmap/phase2-roadmap.md` §M10 and the duplicate entry in `docs/roadmap/milestones.md`.

## 1. Current Repository State

Repository history after M9 (`de825df`):

```
526a818 refactor: make packages/utils Studio-specific, add M0+M1 implementation report
c48f8ba feat(database): implement Prisma 7 database layer                    (M2)
5a337c2 feat(api): bootstrap NestJS API with health endpoint                  (M3)
e4ec488 feat(contracts,sdk): add Studio API contracts and SDK thread          (M4)
5e9e616 feat(api): implement Studio CRUD feature module                       (M5)
957abcd feat(ui): implement theme tokens, Tailwind v4 preset, and shared UI primitives (M6)
c22bc85 feat(desktop): bootstrap Tauri 2 shell with Studio list/create        (M7)
87a9f7d feat(web): bootstrap Next.js portal with Studio list/create           (M8)
de825df feat(logging,storage): wire structured logging and local storage adapter (M9)
```

What exists and is real going into M10:

- **`apps/api`** (M3–M9): NestJS server with `GET /health`, `POST /studios`, `GET /studios`, structured JSON logging (M9), global `HttpExceptionFilter`, `PrismaService`. **All Studio endpoints are unauthenticated.** No `apps/api/src/modules/auth/` implementation yet (folder reserved per frozen architecture).
- **`packages/database`** (M2): `Studio` model only in both SQLite and PostgreSQL schemas. **No `User` model.**
- **`packages/contracts`**: Studio + common DTOs implemented (M4/M5). `src/auth/.gitkeep` only — empty placeholder per ADR 0002.
- **`packages/validation`**: Studio + env schemas implemented. `src/auth/.gitkeep` and `src/session/.gitkeep` only.
- **`packages/api-sdk`** (M4/M5): `createHttpClient`, `createStudiosApi`. **`getAuthHeaders` hook exists but is unused** — reserved in M4 for M10 token injection.
- **`packages/constants`**: `ROUTES.STUDIOS`, `API_ERROR_CODES` (no `UNAUTHORIZED`). `ROLES.OWNER` / `ROLES.STAFF` defined but **not enforced** (comment defers to M10).
- **`apps/desktop`** (M7) and **`apps/web`** (M8): Studio list/create with dev CORS proxies. **No login UI.** Header has reserved `data-slot="header-actions"` for future auth (M7/M8 planning).
- **`infra/env/.env.example`**: `AUTH_PROVIDER=` and `AUTH_SECRET=` placeholders already documented.
- **ADR 0002**: authentication provider **deferred**; touchpoints documented; decision scheduled for M10.

What is pure scaffolding today (M10 targets):

```
packages/contracts/src/auth/          (.gitkeep only)
packages/validation/src/auth/         (.gitkeep only)
packages/validation/src/session/      (.gitkeep only)
apps/api/src/modules/auth/            (does not exist yet — to be created)
```

**Product bible note:** `docs/product-bible/README.md` remains index-only. M10 scope is the roadmap's verbatim Definition of Done: **clients can log in; Studio create requires a valid session.** No speculative auth screens beyond minimal login/logout.

## 2. M10 Goal (from the Roadmap, Verbatim Scope)

> **Goal:** resolve the TBD auth provider and protect the Studio endpoints.
>
> - ADR decision from M0 finalized (e.g. custom JWT vs Clerk/Auth0).
> - Implement session/JWT issuance in `apps/api/src/modules/auth`, token injection + refresh hook in `packages/api-sdk`.
> - Protect `POST /studios` behind auth; leave `GET /studios` open or protected per product decision.
>
> **Depends on:** M4, M5.
>
> **Definition of done:** desktop and web clients can log in and the Studio create flow requires a valid session.

**Scope interpretation (strict):**

- **In scope:** finalize auth provider ADR; add minimal `User` persistence; auth contracts/validation; `apps/api` auth module (login + refresh + JWT guard); protect `POST /studios`; wire `packages/api-sdk` token injection + refresh; minimal login/logout UI in **both** desktop and web; e2e validation.
- **Out of scope:** Clerk/Auth0 integration (unless explicitly chosen in open decision #1); OAuth/social login; user registration UI; password reset/email verification; RBAC enforcement beyond "authenticated"; protecting `GET /studios` (unless open decision #2 chooses otherwise); offline auth (M11); CI (M13); changes unrelated to auth.

M10 **requires client changes** — the Definition of Done explicitly names desktop and web login flows.

## 3. Auth Provider Decision (ADR 0002 Resolution)

ADR 0002 listed three candidate options. For M10 planning, the **recommended decision** is:

| Option | M10 recommendation | Rationale |
|---|---|---|
| **Custom JWT** (`@nestjs/jwt` + bcrypt password verify) | **Recommended** | Zero external vendor dependency; full control; matches monorepo "walking skeleton" principle; `AUTH_SECRET` already in `.env.example`; no network calls to third-party auth APIs; easiest to test locally with seeded dev user. |
| Clerk / Auth0 | Not recommended for M10 | External dependency, cost, vendor lock-in; requires webhook/sync or JWT validation against provider keys; overkill for one protected endpoint in dev. |
| Session cookies only (no JWT) | Not recommended | Harder for desktop Tauri + API cross-origin; `api-sdk` already designed around header injection, not cookies. |

**Deliverable:** update [ADR 0002](../system-architecture/adr/0002-authentication-provider.md) status from **Deferred** to **Accepted — Custom JWT (access + refresh tokens)**, documenting access/refresh token lifetimes, bcrypt for password hashing, and Bearer header transport.

No new ADR file required unless review prefers a separate ADR 0004; updating ADR 0002 in place is sufficient and avoids numbering collision with ADR 0003 (soft delete).

## 4. Database — Minimal `User` Model

Auth issuance requires a user record. Add to **both** Prisma schemas (SQLite dev + PostgreSQL prod parity, same M2 dual-provider pattern):

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         String   @default("owner")  // matches ROLES constant values
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("users")
}
```

- **Migration:** new SQLite migration via `prisma migrate dev` (M2 workflow).
- **Seed:** one dev user inserted by a small seed script or migration SQL — e.g. `dev@st-manager.local` with a documented dev password (hashed with bcrypt). **No public registration endpoint in M10** — seed-only user keeps scope minimal.
- **Scope note:** `packages/database` is touched even though M10 roadmap dependency is M4/M5 — unavoidable for credential verification.

## 5. `packages/contracts` — Auth DTOs

New files under `packages/contracts/src/auth/`:

| DTO | Purpose |
|---|---|
| `LoginRequestDto` | `{ email: string; password: string }` |
| `LoginResponseDto` | `{ accessToken: string; refreshToken: string; expiresIn: number; user: AuthUserDto }` wrapped in `{ success, data }` per M5 envelope |
| `RefreshRequestDto` | `{ refreshToken: string }` |
| `RefreshResponseDto` | `{ accessToken: string; refreshToken: string; expiresIn: number }` wrapped in `{ success, data }` |
| `AuthUserDto` | `{ id: string; email: string; role: string }` — no password fields |

Export from `packages/contracts/src/index.ts`.

**Session folder:** `packages/validation/src/session/` can remain empty in M10 if refresh token payload is opaque JWT-only; no separate session table in minimal JWT approach.

## 6. `packages/validation` — Auth Schemas

New files under `packages/validation/src/auth/`:

| Schema | Validates |
|---|---|
| `loginSchema` | email (valid email), password (min length, e.g. 8) |
| `refreshSchema` | refreshToken (non-empty string) |

Export types `LoginInput`, `RefreshInput` from `packages/validation/src/index.ts`.

Extend `apiEnvSchema` with:

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | JWT signing secret (required in all envs) |
| `JWT_ACCESS_EXPIRES_IN` | e.g. `"15m"` (default) |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `"7d"` (default) |

## 7. `packages/constants` Updates

| Constant | Change |
|---|---|
| `ROUTES.AUTH` | `"auth"` — base path for auth controller |
| `ROUTES.AUTH_LOGIN` | `"auth/login"` or nested under AUTH — **use `AUTH: "auth"` and controller routes `login`/`refresh`** |
| `API_ERROR_CODES.UNAUTHORIZED` | `"UNAUTHORIZED"` — for 401 responses |

Update `HttpExceptionFilter.mapStatusToErrorCode` in `apps/api` to map `401 → UNAUTHORIZED`.

## 8. `apps/api` Auth Module Architecture

### 8.1 Module layout

```
apps/api/src/modules/auth/
  auth.module.ts           # imports JwtModule, registers providers
  auth.controller.ts       # POST /auth/login, POST /auth/refresh
  auth.service.ts            # validate credentials, issue tokens
  auth.repository.ts         # find user by email (only Prisma touchpoint for User)
  jwt-auth.guard.ts          # Passport JWT guard or custom CanActivate
  jwt.strategy.ts            # validates Bearer access token (if using @nestjs/passport)
  decorators/
    public.decorator.ts      # optional — mark routes that skip auth
```

Register `AuthModule` in `AppModule`. Keep layering consistent with Studios (controller → service → repository).

### 8.2 API routes

| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| `POST` | `/auth/login` | Public | `LoginRequestDto` | `200`, `LoginResponseDto` envelope |
| `POST` | `/auth/refresh` | Public | `RefreshRequestDto` | `200`, `RefreshResponseDto` envelope |
| `POST` | `/studios` | **Protected** | `CreateStudioDto` | `201` (unchanged shape) |
| `GET` | `/studios` | **Public** (recommended) | query | `200` (unchanged) |
| `GET` | `/health` | Public | — | `200` (unchanged) |

Path segments from `ROUTES` constants, not hardcoded strings.

### 8.3 Protecting `POST /studios`

Apply `@UseGuards(JwtAuthGuard)` on `StudiosController.create()` only — not the whole controller — so `GET /studios` stays public if open decision #2 recommends open list.

Unauthenticated create returns `401` with `{ success: false, error: "UNAUTHORIZED", ... }` via existing `HttpExceptionFilter`.

### 8.4 Token design (custom JWT)

| Token | Claims | Storage (server) |
|---|---|---|
| Access JWT | `sub` (user id), `email`, `role`, `type: "access"` | Stateless |
| Refresh JWT | `sub`, `type: "refresh"`, `jti` (optional) | Stateless for M10 (no refresh token revocation table) |

**M10 limitation:** refresh tokens cannot be revoked server-side without a session store — acceptable for minimal implementation; document for M11+ hardening.

### 8.5 Dependencies (apps/api)

| Package | Why |
|---|---|
| `@nestjs/jwt` | Sign/verify JWTs |
| `@nestjs/passport` + `passport-jwt` | Standard Nest JWT guard (recommended) **or** custom guard with `JwtService.verify` only |
| `bcrypt` + `@types/bcrypt` | Password hash verify |
| `@st-manager/contracts` | Auth DTO types (already dependency) |
| `@st-manager/validation` | Auth Zod schemas (already dependency) |

## 9. `packages/api-sdk` — Token Injection and Refresh Hook

### 9.1 New auth API module

```
packages/api-sdk/src/auth/
  auth.api.ts              # createAuthApi(client): { login, refresh }
```

- `login(credentials)` → unwraps `{ success, data }` → returns tokens + user.
- `refresh(refreshToken)` → returns new token pair.

### 9.2 Extend `ApiClientConfig`

```ts
export interface ApiClientConfig {
  baseUrl: string;
  fetch?: typeof fetch;
  getAuthHeaders?: () => Record<string, string> | undefined;
  /** M10: called on 401 before giving up; return true to retry request once. */
  onUnauthorized?: () => Promise<boolean>;
}
```

**Refresh flow (recommended):**

1. Request fails with `401` and `error === "UNAUTHORIZED"`.
2. If `onUnauthorized` is configured, call it (app layer attempts `authApi.refresh()` using stored refresh token, updates access token in token store).
3. If refresh succeeds, retry the original request **once** with updated `getAuthHeaders()`.
4. If refresh fails, propagate `401` — UI prompts re-login.

`getAuthHeaders` returns `{ Authorization: "Bearer <accessToken>" }` when token present.

### 9.3 App-layer token store (not in api-sdk)

Per ADR 0002: **no provider logic inside api-sdk** — apps own storage.

Each client adds:

```
apps/desktop/src/lib/token-store.ts
apps/web/src/lib/token-store.ts
```

- Persist `accessToken`, `refreshToken` in **`localStorage`** (recommended — survives refresh).
- Wire `getAuthHeaders` + `onUnauthorized` in `api-client.ts`.
- Export `createAuthApi` usage alongside `createStudiosApi`.

## 10. Client UI — Minimal Login (Desktop + Web)

Definition of Done requires **both clients** to log in. Mirror the same UX pattern:

### 10.1 Header auth slot (M7/M8 reserved)

Populate `data-slot="header-actions"` in `Header.tsx`:

- **Logged out:** compact login form (email + password + "Sign in" button) **or** a "Sign in" control opening an inline `Card` dropdown — keep minimal, use `packages/ui` `Input`/`Button`/`Card`.
- **Logged in:** show user email + "Sign out" button.

### 10.2 Studios page behavior

- **List:** continues to work without login (if GET stays open).
- **Create:** `StudioForm` submit calls `studiosApi.createStudio()` — without token, API returns `401`; surface error via existing form error state ("Sign in to create studios") **or** disable form until authenticated (recommended: disable + helper text for clearer UX).

No new routes required (`/login` page optional — see open decision #4). No new sidebar nav items.

### 10.3 Env documentation

Update `apps/desktop/.env.example` and `apps/web/.env.example` if needed — auth is client-side token storage; API URL unchanged.

## 11. Folder Structure Summary

**New:**

```
packages/contracts/src/auth/*.ts
packages/validation/src/auth/*.ts
packages/api-sdk/src/auth/auth.api.ts
packages/database/prisma/sqlite/migrations/..._add_user/
packages/database/prisma/postgresql/... (keep schemas in sync; migration strategy per M2)
apps/api/src/modules/auth/...
apps/api/src/common/guards/ or auth/jwt-auth.guard.ts
apps/desktop/src/lib/token-store.ts
apps/desktop/src/components/auth/LoginActions.tsx (or similar)
apps/web/src/lib/token-store.ts
apps/web/src/components/auth/LoginActions.tsx
docs/system-architecture/adr/0002-authentication-provider.md  (updated)
docs/meeting-notes/M10-implementation-report.md  (at implementation time)
```

**Modified:**

- `packages/database/prisma/{sqlite,postgresql}/schema.prisma`
- `packages/contracts/src/index.ts`
- `packages/validation/src/index.ts`, `api-env.schema.ts`
- `packages/constants/src/routes.ts`, `errors.ts`
- `packages/api-sdk/src/client/{http-client.ts,types.ts}`, `index.ts`
- `apps/api/src/modules/studios/studios.controller.ts`
- `apps/api/src/common/filters/http-exception.filter.ts`
- `apps/api/src/app.module.ts`, `package.json`
- `apps/desktop/src/lib/api-client.ts`, `Header.tsx`
- `apps/web/src/lib/api-client.ts`, `Header.tsx`
- `infra/env/.env.example`, `apps/api/.env.example` (if present)
- `pnpm-lock.yaml`

**Explicitly not modified:** Studio business logic beyond guard; `packages/ui` primitives (reuse only); M11 sync; `packages/storage` feature wiring.

## 12. Dependencies Required and Justification

| Package | Dependency | Type | Why |
|---|---|---|---|
| `apps/api` | `@nestjs/jwt` | dependency | JWT sign/verify |
| `apps/api` | `@nestjs/passport`, `passport`, `passport-jwt` | dependency | JWT auth guard |
| `apps/api` | `bcrypt` | dependency | Password verification |
| `apps/api` | `@types/bcrypt`, `@types/passport-jwt` | devDependency | Types |
| `packages/database` | (none new npm) | — | Schema + migration only |
| `packages/api-sdk` | (none new npm) | — | Native fetch unchanged |
| Clients | (none new npm) | — | Reuse `packages/ui` |

## 13. Risks

1. **Database migration scope creep.** Adding `User` touches `packages/database` outside literal M4/M5 deps — necessary for credentials; keep model minimal.
2. **Refresh token revocation absent.** Stateless refresh JWTs cannot be invalidated until a session store lands — document explicitly.
3. **Dev password in seed/docs.** Must not commit real secrets; use documented dev-only credentials and `.env` `AUTH_SECRET`.
4. **401 on create before login.** UX must guide users to sign in — disable form or clear error message.
5. **CORS in production.** Dev proxies unchanged; production cross-origin login still needs API CORS or shared origin (known M7/M8 limitation).
6. **Root `pnpm typecheck`.** May still fail on empty `packages/ai`, `packages/events` scaffolds — validate M10 packages in isolation.
7. **bcrypt native module.** `bcrypt` may need build tools; alternative `bcryptjs` (pure JS) if install fails — flag as implementation contingency.

## 14. Validation Strategy

1. `pnpm install` — after dependency additions.
2. `pnpm --filter @st-manager/database db:migrate:sqlite:dev` — apply User migration.
3. `pnpm --filter @st-manager/{contracts,validation,constants,api-sdk,database,api} build` and isolated `typecheck` — pass.
4. `pnpm lint` — zero new errors/warnings.
5. **API auth:**

   ```bash
   pnpm --filter @st-manager/api dev
   ```

   - `POST /auth/login` with seeded credentials → `{ success: true, data: { accessToken, refreshToken, ... } }`
   - `POST /studios` without token → `401`, `error: "UNAUTHORIZED"`
   - `POST /studios` with `Authorization: Bearer <accessToken>` → `201`
   - `GET /studios` without token → `200` (if open list decision)
   - `POST /auth/refresh` with refresh token → new access token

6. **End-to-end (Definition of Done):**

   ```bash
   # Terminal 1
   pnpm --filter @st-manager/api dev

   # Terminal 2 — desktop
   pnpm --filter @st-manager/desktop dev

   # Terminal 3 — web
   pnpm --filter @st-manager/web dev
   ```

   - Desktop: sign in via header → create studio succeeds.
   - Web: sign in via header → create studio succeeds.
   - Sign out → create fails with auth error / disabled form.
   - List still loads when logged out (if GET open).

7. `pnpm build` (root) — no regression.
8. Optional screenshot evidence for implementation report (`docs/meeting-notes/assets/m10-auth-login.png`).

## 15. Definition of Done

- [ ] ADR 0002 updated to **Accepted — Custom JWT**.
- [ ] `User` model migrated; seeded dev user can log in.
- [ ] `POST /auth/login` and `POST /auth/refresh` implemented with contract/validation alignment.
- [ ] `POST /studios` requires valid Bearer access token.
- [ ] `packages/api-sdk` exposes `createAuthApi`, `getAuthHeaders` wired, refresh retry on 401.
- [ ] Desktop and web clients provide minimal login/logout UI and can complete authenticated studio create.
- [ ] `pnpm lint` and `pnpm build` pass; M10 packages typecheck in isolation.
- [ ] `docs/meeting-notes/M10-implementation-report.md` written at implementation time.
- [ ] Nothing committed until implementation report is reviewed and approved.

## 16. Next Recommended Milestone

**M11 — Embedded SQLite and Background Sync.** Depends on M10 for authenticated sync requests. M11 has **not** been started.

---

**Open decisions requiring explicit approval before implementation** (summarized for one-pass review):

1. **Auth provider:** **Custom JWT with `@nestjs/jwt` + bcrypt** (recommended) vs. **Clerk** vs. **Auth0**.

2. **`GET /studios` access:** **Leave public** — list without login, create requires auth (recommended — matches roadmap option and simpler demo) vs. **protect both** POST and GET.

3. **User provisioning:** **Seeded dev user only** — no registration endpoint (recommended — minimal scope) vs. **add `POST /auth/register`**.

4. **Login UI placement:** **Compact form in header `header-actions` slot** on both clients (recommended — uses M7/M8 reserved slot, no new routes) vs. **dedicated `/login` route/page**.

5. **Token storage (clients):** **`localStorage`** (recommended — survives page reload) vs. **`sessionStorage`** (cleared on tab close).

6. **Refresh behavior in api-sdk:** **Automatic single retry on 401** via `onUnauthorized` hook calling refresh (recommended — matches roadmap "refresh hook") vs. **manual re-login only** (no automatic retry).

Stopping here per instructions — no source code, dependencies, scaffolding commands, or commits have been touched. Awaiting review and approval of this plan (and the six decisions above) before implementing M10.
