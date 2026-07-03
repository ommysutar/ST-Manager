# M10 Implementation Report — Auth Decision and Minimal Implementation

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base: M9 (`de825df`), committed
- Date: 2026-07-03
- Scope: Custom JWT auth end-to-end — database `User` model, auth contracts/validation, `apps/api` auth module, `packages/api-sdk` token injection + refresh retry, desktop/web login UI, ADR 0002 resolution, and this report.
- Source: [M10 planning report](./M10-planning-report.md) (approved as written, including all five recommended open decisions)

## 1. Executive Summary

M10 resolves ADR 0002 with **custom JWT authentication** (access + refresh tokens, bcrypt password verification) and protects **`POST /studios`** behind a Bearer token guard. **`GET /studios`** remains public. Desktop and web clients now expose a minimal **Sign in / Sign out** flow in the header `header-actions` slot, persist tokens in **`localStorage`**, and wire `getAuthHeaders` + single automatic retry on `401 UNAUTHORIZED` through `packages/api-sdk`.

All five open decisions from the planning report were applied as recommended:

1. **Custom JWT + bcrypt** — not Clerk/Auth0.
2. **`GET /studios` public**, **`POST /studios` protected**.
3. **Seeded dev user only** — no registration endpoint (`dev@st-manager.local` / `devpassword`).
4. **Login UI in header** `header-actions` slot (desktop + web).
5. **`localStorage` token storage** with automatic single retry on `401` via `onUnauthorized`.

Two implementation-time fixes were required: a **TypeScript cast** for JWT `expiresIn` env strings (`JwtSignOptions`), and **proxy rewrites** for auth routes in desktop Vite (`/auth`) and web Next.js (`/api/auth`) so client dev servers can reach the new API endpoints.

## 2. Files Created

**`packages/database/`**

- `prisma/sqlite/migrations/20260703083416_add_user/migration.sql` — creates `users` table.
- `scripts/seed-dev-user.ts` — upserts dev user with bcrypt hash (cost 10).

**`packages/contracts/src/auth/`**

- `auth-user.dto.ts` — `AuthUserDto`.
- `login.dto.ts` — login request/response DTOs.
- `refresh.dto.ts` — refresh request/response DTOs.

**`packages/validation/src/auth/`**

- `login.schema.ts` — `loginSchema`, `LoginInput`.
- `refresh.schema.ts` — `refreshSchema`, `RefreshInput`.

**`packages/api-sdk/src/auth/`**

- `auth.api.ts` — `createAuthApi` with `login`, `refresh`.

**`apps/api/src/modules/auth/`**

- `auth.module.ts` — registers JwtModule, PassportModule, providers.
- `auth.controller.ts` — `POST /auth/login`, `POST /auth/refresh`.
- `auth.service.ts` — credential validation, token pair issuance.
- `auth.repository.ts` — Prisma user lookup by email/id.
- `jwt.strategy.ts` — Passport JWT strategy (access tokens only).
- `jwt-auth.guard.ts` — `JwtAuthGuard` for protected routes.
- `auth.types.ts`, `auth.utils.ts` — payload types, `expiresInToSeconds`.

**`apps/api/scripts/`**

- `auth-smoke.sh` — curl-based auth regression script.

**`apps/desktop/`**

- `src/lib/token-store.ts` — `localStorage` session persistence.
- `src/hooks/useAuth.ts` — login/logout state hook.
- `src/components/auth/LoginActions.tsx` — header login form.

**`apps/web/`**

- `src/lib/token-store.ts` — same API as desktop.
- `src/hooks/useAuth.ts` — same hook pattern as desktop.
- `src/components/auth/LoginActions.tsx` — header login form (client component).

**`docs/`**

- `meeting-notes/M10-implementation-report.md` (this file).

## 3. Files Modified

- `packages/database/prisma/sqlite/schema.prisma` — `User` model.
- `packages/database/prisma/postgresql/schema.prisma` — `User` model (parity).
- `packages/database/package.json` — `db:seed:dev` script; `bcrypt`, `tsx` devDependencies.
- `packages/contracts/src/index.ts` — export auth DTOs.
- `packages/validation/src/index.ts` — export auth schemas/types.
- `packages/validation/src/env/api-env.schema.ts` — `AUTH_SECRET`, JWT expiry vars.
- `packages/constants/src/routes.ts` — `ROUTES.AUTH`.
- `packages/constants/src/errors.ts` — `API_ERROR_CODES.UNAUTHORIZED`.
- `packages/api-sdk/src/client/http-client.ts` — `onUnauthorized` single retry on 401.
- `packages/api-sdk/src/client/types.ts` — `onUnauthorized` on `ApiClientConfig`.
- `packages/api-sdk/src/index.ts` — export `createAuthApi`.
- `packages/api-sdk/README.md` — document auth API + retry hook.
- `apps/api/package.json` — `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`.
- `apps/api/.env.example` — `AUTH_SECRET`, JWT expiry vars.
- `apps/api/src/app.module.ts` — import `AuthModule`.
- `apps/api/src/common/filters/http-exception.filter.ts` — map `401 → UNAUTHORIZED`.
- `apps/api/src/modules/studios/studios.controller.ts` — `@UseGuards(JwtAuthGuard)` on `create()` only.
- `apps/api/src/modules/studios/studios.module.ts` — import `AuthModule`.
- `apps/desktop/src/lib/api-client.ts` — auth headers, refresh hook, `createAuthApi`.
- `apps/desktop/vite.config.ts` — proxy `/auth` → `:4000`.
- `apps/desktop/src/app/shell/Header.tsx` — render `LoginActions`.
- `apps/desktop/src/app/studios/StudiosPage.tsx` — hide create form when logged out.
- `apps/web/src/lib/api-client.ts` — same auth wiring as desktop.
- `apps/web/next.config.ts` — rewrites `/api/auth` and `/api/auth/:path*`.
- `apps/web/src/components/shell/Header.tsx` — render `LoginActions`.
- `apps/web/src/components/studios/StudiosPageClient.tsx` — hide create form when logged out.
- `docs/system-architecture/adr/0002-authentication-provider.md` — status **Accepted — Custom JWT**.
- `infra/env/.env.example` — document auth env vars.
- `pnpm-lock.yaml` — new auth dependencies.
- Deleted superseded `.gitkeep` files in `packages/contracts/src/auth/` and `packages/validation/src/auth/`.

**Unchanged (as planned):** M11 sync, user registration, RBAC beyond authenticated guard, `packages/ui` primitives (reused only), `packages/storage` feature wiring, `packages/logging` behavior.

## 4. Dependencies Added (Resolved Versions)

| Package | Dependency | Type | Resolved version |
|---|---|---|---|
| `apps/api` | `@nestjs/jwt` | dependency | 11.0.2 |
| `apps/api` | `@nestjs/passport` | dependency | 11.0.5 |
| `apps/api` | `passport` | dependency | 0.7.0 |
| `apps/api` | `passport-jwt` | dependency | 4.0.1 |
| `apps/api` | `bcrypt` | dependency | 6.0.0 |
| `apps/api` | `@types/bcrypt` | devDependency | 6.0.0 |
| `apps/api` | `@types/passport-jwt` | devDependency | 4.0.1 |
| `packages/database` | `bcrypt` | devDependency | 6.0.0 |
| `packages/database` | `tsx` | devDependency | 4.19.2 |

No new runtime dependencies in `packages/api-sdk`, `apps/desktop`, or `apps/web`.

## 5. Approved Architectural Decisions Applied

| Decision (planning report §12) | Choice applied |
|---|---|
| Auth provider | Custom JWT + bcrypt (ADR 0002 accepted) |
| Route protection | `POST /studios` protected; `GET /studios` public |
| User provisioning | Seeded dev user only — `pnpm --filter @st-manager/database db:seed:dev` |
| Login UI placement | Header `header-actions` slot in desktop + web |
| Token storage | `localStorage` in app layers; api-sdk injects headers only |
| Refresh retry | Single automatic retry on `401 UNAUTHORIZED` via `onUnauthorized` |

**Dev credentials:** `dev@st-manager.local` / `devpassword`

## 6. Deviations From Plan (Justified)

### 6.1 JWT `expiresIn` TypeScript typing

**Plan assumption:** env strings (`15m`, `7d`) pass directly to `JwtService.signAsync`.

**Reality:** `@nestjs/jwt` v11 expects `JwtSignOptions["expiresIn"]`; plain `string` from Zod env schema caused TS2769.

**Fix:** Cast env values to `JwtSignOptions["expiresIn"]` in `auth.service.ts` when building sign options.

### 6.2 Client dev proxy routes for auth

**Plan assumption:** existing `/studios` and `/health` proxies suffice.

**Reality:** New `POST /auth/login` and `POST /auth/refresh` endpoints are unreachable from client dev origins without additional proxy/rewrite rules (CORS same-origin pattern from M7/M8).

**Fix (M10 scope):**

- Desktop `vite.config.ts`: proxy `/auth` → `http://localhost:4000`.
- Web `next.config.ts`: rewrites `/api/auth` and `/api/auth/:path*` → `http://localhost:4000/auth/:path*`.

### 6.3 `useAuth` initial state without `useEffect`

**Plan assumption:** standard React auth hook pattern.

**Reality:** ESLint `react-hooks/set-state-in-effect` flagged synchronous `setState` in `useEffect` on mount.

**Fix:** Initialize user state with `useState(() => tokenStore.getUser())` — reads persisted session once without an effect.

### 6.4 PostgreSQL migration not generated locally

**Plan assumption:** dual-schema parity per M2.

**Reality:** SQLite migration applied via `prisma migrate dev`; PostgreSQL schema updated in place. Production PostgreSQL deploy migration (`db:migrate:postgresql:deploy`) not run in this dev session — same M2 pattern as prior milestones where SQLite is the local source of truth.

## 7. Validation Results

### 7.1 Database

| Check | Result |
|---|---|
| `pnpm --filter @st-manager/database db:generate` | **Pass** |
| SQLite migration `20260703083416_add_user` | **Applied** |
| `pnpm --filter @st-manager/database db:seed:dev` | **Pass** — `Seeded dev user dev@st-manager.local` |

### 7.2 Package builds and typechecks

| Check | Result |
|---|---|
| `pnpm install` | **Pass** |
| `pnpm --filter @st-manager/{constants,contracts,validation,api-sdk,database} build` | **Pass** |
| `pnpm --filter @st-manager/api build` | **Pass** |
| `pnpm --filter @st-manager/{api,desktop,web,api-sdk,contracts,validation,database} typecheck` | **Pass** |
| `pnpm lint` | **Pass** — 0 errors, 0 warnings |
| `pnpm build` (root, 13 tasks) | **Pass** |

### 7.3 Auth smoke test (API)

**Setup:**

```bash
pnpm --filter @st-manager/api dev   # API on :4000
bash apps/api/scripts/auth-smoke.sh
```

**Result:** **Pass**

```
M10 auth smoke against http://localhost:4000
M10 auth smoke: login, protected create, refresh, and public list passed
```

Script verifies:

1. `POST /studios` without token → **401**
2. `POST /auth/login` → tokens returned
3. `POST /studios` with Bearer token → **201**
4. `POST /auth/refresh` → new access token
5. `GET /studios` without token → **200**

### 7.4 Client proxy validation

| Check | Result |
|---|---|
| `POST http://localhost:1420/auth/login` (desktop Vite proxy) | **Pass** — `{ success: true, data.user.email: "dev@st-manager.local" }` |
| `POST http://localhost:3010/api/auth/login` (web Next rewrite) | **Pass** — same response shape |
| `POST http://localhost:3010/api/studios` with Bearer token | **Pass** — **201** (`M10 Web Validation Studio`) |
| `GET http://localhost:3010/api/studios` without token | **Pass** — **200**, public list |

### 7.5 Desktop/web UI validation

| Check | Result |
|---|---|
| Web `http://localhost:3010/studios` page load | **Pass** — HTTP 200; header shows email field pre-filled `dev@st-manager.local`, Sign in button, "Sign in to create studios." helper text |
| Desktop dev server `http://localhost:1420` | **Pass** — Vite serving; auth proxy confirmed (§7.4) |
| Studios create form hidden when logged out | **Pass** — both clients render helper text instead of `StudioForm` |
| Full interactive browser login (password autofill) | **Not automated** — blocked by IDE browser policy for credential entry; manual sign-in with `devpassword` recommended during review |

**Note:** A stale web dev instance on `:3002` returned HTTP 500 due to corrupted `.next` cache (`ENOENT` on `_buildManifest.js.tmp.*`). A fresh instance on `:3010` validated cleanly. This is an environment/process issue, not an M10 code defect — `pnpm --filter @st-manager/web build` passes.

## 8. Risks / Remaining Issues

1. **Stateless refresh tokens** — no server-side revocation table; stolen refresh tokens valid until expiry. Acceptable for M10; hardening deferred to M11+.
2. **Seeded user only** — no registration, password reset, or email verification flows.
3. **`localStorage` token storage** — vulnerable to XSS; acceptable for dev walking skeleton; httpOnly cookies or secure storage may be needed for production hardening.
4. **PostgreSQL migration deploy** — schema updated but production migration not exercised in this session.
5. **Root `pnpm typecheck`** — still fails on empty scaffold packages (`packages/ai`, `packages/events`, etc.) — pre-existing, unrelated to M10.
6. **Multiple stale dev server processes** — several long-running `nest start --watch` and `next dev` instances observed; recommend killing orphans before manual review to avoid port conflicts.

## 9. Definition of Done — Status

- [x] ADR 0002 finalized — **Accepted — Custom JWT**.
- [x] `User` model + SQLite migration + dev seed script.
- [x] Auth contracts and validation schemas exported.
- [x] `POST /auth/login` and `POST /auth/refresh` implemented in `apps/api`.
- [x] `POST /studios` protected with `JwtAuthGuard`; `GET /studios` public.
- [x] `401` responses use `UNAUTHORIZED` error code.
- [x] `packages/api-sdk` — `createAuthApi`, `getAuthHeaders`, single retry on 401.
- [x] Desktop + web — header login/logout, `localStorage` token store, create form gated on auth.
- [x] `pnpm lint`, `pnpm build`, package typechecks pass.
- [x] Auth smoke script passes against running API.
- [x] Client dev proxies validated for auth routes.
- [x] This implementation report written before any commit.
- [x] No git commit or push (per instructions).

## 10. Git Status

Working tree has all M10 changes **uncommitted**, per instructions. Modified/created files span `packages/{database,contracts,validation,constants,api-sdk}/`, `apps/{api,desktop,web}/`, `docs/system-architecture/adr/0002-authentication-provider.md`, `infra/env/.env.example`, `pnpm-lock.yaml`, `docs/meeting-notes/M10-planning-report.md`, and this report.

Untracked `M6-commit-summary.md` and `M7-commit-summary.md` from prior milestones remain separately uncommitted and are **not** part of M10 scope.

## 11. Manual Review Checklist (Recommended Before Commit)

1. Start API: `pnpm --filter @st-manager/api dev`
2. Seed user (if fresh DB): `pnpm --filter @st-manager/database db:seed:dev`
3. Run smoke: `bash apps/api/scripts/auth-smoke.sh`
4. Desktop: open `http://localhost:1420/#/studios`, sign in with dev credentials, create a studio, sign out — list should still load.
5. Web: open `http://localhost:3000/studios` (or fresh `next dev` port), same flow.

## 12. Next Recommended Milestone

**M11 — Offline Sync Foundation.** M10 auth is complete; sync and conflict resolution build on the authenticated API client established here.

---

Stopping here per instructions — nothing has been committed. Awaiting review before any commit.
