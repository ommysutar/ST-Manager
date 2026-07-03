# M12 Planning Report — First AI Feature Slice

- Date: 2026-07-03
- Milestone: M12 (First AI Feature Slice)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), [docs/roadmap/milestones.md](../roadmap/milestones.md), [ADR 0002](../system-architecture/adr/0002-authentication-provider.md), M5/M7/M8/M10/M11 planning and implementation reports
- Status: **Planning only — no application code, dependencies, scaffolding commands, or commits have been generated.** Awaiting approval before implementation.

**Note on source documents:** `roadmap/milestones/M12.md` does not exist in this repository. M12 scope is taken verbatim from `docs/roadmap/phase2-roadmap.md` §M12 and the duplicate entry in `docs/roadmap/milestones.md`.

## 1. Current Repository State

Repository history after M11 (`e6aab48`):

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
e73aaee feat(auth): implement custom JWT authentication and protect Studio create (M10)
e6aab48 feat(sync): implement embedded SQLite and background sync (M11)
```

What exists and is real going into M12:

- **`packages/ai`**: scaffolding only — README + empty `src/{prompts,providers,pipelines,types}/.gitkeep`, `package.json` with `typecheck` only (no `build`/`exports`). **No TypeScript source.** Root `pnpm typecheck` still fails here (`TS18003`).
- **`apps/api`** (M3–M11): NestJS with `health`, `studios`, `auth`, `sync` modules. Structured JSON logging (M9). **No `modules/ai/` implementation.** `apps/api/README.md` mentions AI orchestration as future intent (stale scaffold text).
- **`apps/desktop`** (M7 + M10 + M11): Tauri shell, local-first Studios via Tauri SQLite commands, sync engine, header auth + sync indicator. **No AI UI or API calls.**
- **`apps/web`** (M8 + M10): Next.js portal, online Studios list/create via `studiosApi`, header auth. **No AI UI or API calls.**
- **`packages/contracts` / `packages/validation` / `packages/api-sdk`**: studio, auth, sync threads only. **No AI DTOs, schemas, or SDK methods.**
- **`packages/constants`**: `ROUTES.AUTH`, `ROUTES.STUDIOS`, `ROUTES.SYNC` — no `ROUTES.AI`.
- **`packages/ui`**: presentational `StudioList` / `StudioForm` only — **no AI components** (by design; apps own data fetching and feature actions).
- **`infra/env/.env.example`**: placeholders `AI_PROVIDER=` and `AI_API_KEY=` already documented.
- **`packages/validation` `apiEnvSchema`**: no AI env vars yet (only DB, port, JWT vars).
- **ADRs:** 0001 (desktop SQLite), 0002 (custom JWT), 0003 (soft delete deferral). **No AI provider ADR.**

What is pure scaffolding today (M12 targets):

```
packages/ai/src/prompts/          (.gitkeep only)
packages/ai/src/providers/        (.gitkeep only)
packages/ai/src/pipelines/        (.gitkeep only)
packages/ai/src/types/            (.gitkeep only)
apps/api/src/modules/ai/          (does not exist yet)
packages/contracts/src/ai/          (does not exist yet)
packages/validation/src/ai/       (does not exist yet)
packages/api-sdk/src/ai/            (does not exist yet)
```

**Product bible note:** `docs/product-bible/README.md` remains index-only. M12 scope is the roadmap's verbatim Definition of Done: **clicking a button in the running app produces an AI-generated result backed by a real provider call.** The roadmap's example feature is **AI-generated studio summary/notes** — this plan adopts that example as the concrete M12 slice.

## 2. M12 Goal (from the Roadmap, Verbatim Scope)

> **Goal:** prove the AI package end-to-end with one real, small feature (e.g. AI-generated studio summary/notes).
>
> - `packages/ai`: one prompt template, one provider adapter, one pipeline.
> - API endpoint in `apps/api` orchestrating the pipeline.
> - UI trigger in desktop and/or web.
>
> **Depends on:** M5, M7, M8.
>
> **Definition of done:** clicking a button in the running app produces an AI-generated result backed by a real provider call.

**Scope interpretation (strict):**

- **In scope:** first real `packages/ai` implementation (prompt + provider adapter + pipeline); `apps/api` AI module with one orchestration endpoint; contracts/validation/api-sdk AI thread; **Generate summary** button + result display in **both** desktop and web Studios screens; env validation for AI credentials; dev mock provider fallback; e2e validation with real or mock provider.
- **Out of scope:** persisting AI output to database; streaming/SSE responses; chat UI; multi-step agent workflows; RAG/embeddings; fine-tuning; Anthropic/multi-provider switching UI; offline AI on desktop; RBAC beyond authenticated guard; CI workflows (M13); changes unrelated to the one AI feature slice.

M12 **requires API + packages/ai + client changes**. M11 sync is **not** a roadmap dependency — desktop remains local-first for Studio CRUD, but the AI call itself is **online-only** (provider HTTP).

## 3. Feature Choice — Studio Summary

The roadmap gives "e.g. AI-generated studio summary/notes" as the example. M12 adopts:

| Aspect | M12 choice |
|---|---|
| Feature | **Generate a short marketing-style summary** for a selected studio (2–4 sentences) |
| Input | Studio `id` + `name` (name is prompt context; id is correlation/logging) |
| Output | Plain-text `summary` string returned in API response envelope |
| Persistence | **None in M12** — ephemeral display in UI only (avoids Prisma migration, sync, and M11 local/remote schema drift) |
| UI placement | Per-studio **Generate summary** button on Studios page; result shown in expandable `Card` below the button |

**Rationale:** satisfies DoD with minimal schema impact; works on web (online API list) and desktop (local list row supplies `id` + `name`; AI call goes to API over network).

## 4. AI Provider Decision

No ADR exists for AI provider selection. `infra/env/.env.example` already lists `AI_PROVIDER` and `AI_API_KEY`. For M12 planning, the **recommended decision** is:

| Option | M12 recommendation | Rationale |
|---|---|---|
| **OpenAI** (`openai` npm SDK, chat completions) | **Recommended primary provider** | Widest documentation; simple chat API; matches env placeholder names; one adapter proves the pipeline pattern. |
| **Anthropic** | Not recommended for M12 | Second adapter adds scope without proving additional architecture; defer to post-M12. |
| **Mock provider** (deterministic string, no network) | **Recommended dev/CI fallback** | When `AI_API_KEY` is unset or `AI_PROVIDER=mock`, pipeline returns a canned summary — enables local dev and smoke tests without billing. |
| **Client-side provider calls** | **Rejected** | API keys must not ship in desktop/web; orchestration stays server-side per frozen architecture (`packages/ai` consumed by `apps/api`). |

**Deliverable:** document provider choice in `packages/ai/README.md` and extend `apiEnvSchema` + `infra/env/.env.example`. **No new ADR required for M12** unless review prefers ADR 0004 — env + README may suffice for a single-provider slice.

Suggested env vars:

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `"openai"` \| `"mock"` (default `"mock"` in development when key absent) |
| `AI_API_KEY` | Provider secret (required when `AI_PROVIDER=openai`) |
| `AI_MODEL` | e.g. `gpt-4o-mini` (default — cost-effective for summary slice) |

## 5. `packages/ai` — Architecture

First real implementation of the scaffold package. Follow M9 `logging`/`storage` precedent: **`tsc` build to CommonJS** so NestJS can `require()` at runtime.

### 5.1 Layout

```
packages/ai/src/
  types/
    completion.ts           # CompletionRequest, CompletionResult, TokenUsage (optional metadata)
  prompts/
    studio-summary.ts       # buildStudioSummaryPrompt({ name: string }): string
  providers/
    ai-provider.ts          # AiProvider interface: complete(prompt: string): Promise<CompletionResult>
    mock-provider.ts        # deterministic dev response
    openai-provider.ts      # OpenAI chat completions adapter
  pipelines/
    studio-summary.pipeline.ts  # runStudioSummaryPipeline(input, provider): Promise<{ summary: string }>
  index.ts
```

### 5.2 Pipeline behavior

1. Accept `{ studioId: string, name: string }`.
2. Build prompt via `buildStudioSummaryPrompt({ name })` — instruct model to produce a concise professional summary; no PII beyond studio name.
3. Call injected `AiProvider.complete(prompt)`.
4. Return `{ summary: string }` (trimmed, non-empty validation in pipeline).

### 5.3 Provider selection (factory)

```typescript
createAiProvider(config: { provider: "openai" | "mock"; apiKey?: string; model: string }): AiProvider
```

- `mock` — always available.
- `openai` — throws at startup if `AI_API_KEY` missing when provider is `openai`.

### 5.4 Build

Add to `package.json`: `build`, `main`, `types`, `exports` (same pattern as `@st-manager/logging`).

## 6. API — AI Module

### 6.1 Route

| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| `POST` | `/ai/studios/summary` | **JWT** (recommended) | `{ studioId, name }` | `200`, `{ success: true, data: { summary } }` |

Add `ROUTES.AI = "ai"` to `packages/constants`.

**Auth recommendation:** protect with `JwtAuthGuard` — AI calls have cost; M10 JWT infra exists. Not in roadmap dependency graph but consistent with M10/M11 protected writes.

**No studio DB lookup required for M12** — prompt uses request `name` only; `studioId` validated as non-empty string for correlation. Optional future: verify studio exists server-side.

### 6.2 Module layout

```
apps/api/src/modules/ai/
  ai.module.ts              # imports AiProvider factory, registers pipeline
  ai.controller.ts          # POST ai/studios/summary
  ai.service.ts             # delegates to @st-manager/ai pipeline
```

Register `AiModule` in `AppModule`. `AiModule` imports `AuthModule` (for guard).

### 6.3 Error handling

Map provider failures to `503` or `502` with `API_ERROR_CODES` — add `AI_PROVIDER_ERROR` (or reuse `INTERNAL_ERROR` with distinct message for M12 minimal scope). Planning **recommends** new `AI_PROVIDER_ERROR` constant for client-friendly handling.

## 7. `packages/contracts`, `packages/validation`, `packages/api-sdk`

### 7.1 Contracts

New files under `packages/contracts/src/ai/`:

| DTO | Shape |
|---|---|
| `GenerateStudioSummaryRequestDto` | `{ studioId: string; name: string }` |
| `GenerateStudioSummaryResponseDataDto` | `{ summary: string }` |
| `GenerateStudioSummaryResponseDto` | `{ success: true; data: GenerateStudioSummaryResponseDataDto }` |

Export from `packages/contracts/src/index.ts`.

### 7.2 Validation

New file `packages/validation/src/ai/studio-summary.schema.ts`:

- `studioId`: non-empty string
- `name`: same rules as `createStudioSchema.name` (trim, min 1, max 120)

Export `generateStudioSummarySchema`, `GenerateStudioSummaryInput`.

### 7.3 api-sdk

```
packages/api-sdk/src/ai/ai.api.ts   # createAiApi(client): { generateStudioSummary(input) }
```

Path: `POST ${ROUTES.AI}/studios/summary` — reuses M10 `getAuthHeaders` + `onUnauthorized`.

## 8. Client UI — Desktop and Web

Roadmap dependency graph includes **both M7 and M8**; DoD says "the running app" — M12 planning **recommends both clients** for parity (same pattern as M10 auth).

### 8.1 UX flow

1. User is **signed in** and **online** (AI requires network to API + provider).
2. Each studio row/card shows **Generate summary** (`Button`, `variant="outline"`, `size="sm"`).
3. Click → loading state on that row → `aiApi.generateStudioSummary({ studioId, name })`.
4. On success → show `summary` text in a `Card`/`CardContent` below the studio card (app-layer component, not `packages/ui`).
5. On error → inline error message via `ApiError.message`.

### 8.2 Desktop specifics (post-M11)

- Studio list comes from **local SQLite** (`listLocalStudios()`).
- AI button uses `id` + `name` from the local row — **works even for `pending` sync studios** (no server row required for M12 prompt input).
- Disable AI buttons when `!navigator.onLine` or `!isAuthenticated` with helper text.

### 8.3 Web specifics

- Studio list from `studiosApi.listStudios()` (unchanged).
- Same button/result pattern as desktop.

### 8.4 App-layer components (recommended)

```
apps/desktop/src/components/ai/StudioSummaryActions.tsx
apps/web/src/components/ai/StudioSummaryActions.tsx
```

Props: `{ studioId: string; name: string; disabled?: boolean }` — keeps `StudiosPage` readable. **Do not add to `packages/ui`** in M12 (feature-specific, not a primitive).

Integrate into existing `StudioList` rendering by wrapping each card or placing actions adjacent — implementation may map studios in `StudiosPage` rather than modifying `StudioList` props (avoids changing shared UI package in M12).

### 8.5 Proxy updates

- **Desktop** `vite.config.ts`: proxy `/ai` → `http://localhost:4000` (same pattern as M10 `/auth`, M11 `/sync`).
- **Web** `next.config.ts`: rewrite `/api/ai` and `/api/ai/:path*` → API (same pattern as auth/sync).

## 9. Folder Structure Summary

**New:**

```
packages/ai/src/types/completion.ts
packages/ai/src/prompts/studio-summary.ts
packages/ai/src/providers/{ai-provider,mock-provider,openai-provider}.ts
packages/ai/src/pipelines/studio-summary.pipeline.ts
packages/ai/src/index.ts
packages/contracts/src/ai/studio-summary.dto.ts
packages/validation/src/ai/studio-summary.schema.ts
packages/api-sdk/src/ai/ai.api.ts
apps/api/src/modules/ai/*
apps/api/scripts/ai-smoke.sh
apps/desktop/src/components/ai/StudioSummaryActions.tsx
apps/web/src/components/ai/StudioSummaryActions.tsx
docs/meeting-notes/M12-implementation-report.md  (at implementation time)
```

**Modified:**

- `packages/ai/package.json`, `tsconfig.json`, README
- `packages/constants/src/routes.ts`, `errors.ts` (optional `AI_PROVIDER_ERROR`)
- `packages/contracts/src/index.ts`
- `packages/validation/src/index.ts`, `env/api-env.schema.ts`
- `packages/api-sdk/src/index.ts`, README
- `apps/api/package.json` — `@st-manager/ai`, `openai` dependencies
- `apps/api/src/app.module.ts`
- `apps/api/.env.example`, `infra/env/.env.example`
- `apps/desktop/vite.config.ts`, `apps/desktop/src/app/studios/StudiosPage.tsx`
- `apps/web/next.config.ts`, `apps/web/src/components/studios/StudiosPageClient.tsx`
- `pnpm-lock.yaml`

**Explicitly not modified:** Prisma schemas; M11 sync protocol; `packages/ui` StudioList/StudioForm props; `packages/events`; CI (M13).

## 10. Dependencies Required and Justification

| Package | Dependency | Type | Why |
|---|---|---|---|
| `apps/api` | `@st-manager/ai` | dependency (workspace) | Pipeline + providers |
| `apps/api` | `openai` | dependency | OpenAI SDK for primary provider |
| `packages/ai` | `openai` | dependency | Provider adapter (or peer via api only — prefer api-only to keep ai package mock-testable without openai in pipeline tests) |
| `packages/ai` | `@types/node` | devDependency | If Node types needed |

**Planning recommendation:** install `openai` on **`apps/api` only**; `packages/ai` defines the `AiProvider` interface and mock adapter; `openai-provider.ts` may live in `apps/api` **or** `packages/ai` with `openai` as dependency of `packages/ai`. Prefer **`openai` in `packages/ai`** so the adapter stays with the provider abstraction (cleaner boundary).

| Package | Dependency | Type | Why |
|---|---|---|---|
| `packages/ai` | `openai` | dependency | OpenAI adapter implementation |
| `packages/ai` | `@types/node` | devDependency | Node types for SDK |
| `apps/api` | `@st-manager/ai` | workspace | Orchestration |

No new client npm dependencies.

## 11. Risks

1. **API key handling** — keys only in server env; never in client bundles or commits. Smoke tests use `mock` provider by default.
2. **Cost exposure** — unauthenticated endpoint would allow abuse; mitigate with JWT guard.
3. **Desktop offline UX** — AI buttons must be disabled offline; local studios still listable (M11 behavior unchanged).
4. **No persistence** — user loses summary on refresh; acceptable for M12 slice; document in UI.
5. **OpenAI SDK / network failures** — map to structured API errors; client shows message.
6. **Root `pnpm typecheck`** — implementing `packages/ai` should **fix** its `TS18003` failure; validate M12 packages in isolation.
7. **CommonJS interop** — same Nest `require()` issue as M9 logging; set CommonJS in `packages/ai/tsconfig.json` proactively.
8. **Provider lock-in** — OpenAI-only for M12; `AiProvider` interface allows future adapters without client changes.

## 12. Validation Strategy

1. `pnpm install` — after dependency additions.
2. `pnpm --filter @st-manager/ai build` + `typecheck` — pass (first real exports).
3. `pnpm --filter @st-manager/{contracts,validation,constants,api-sdk,api} build` + isolated `typecheck` — pass.
4. `pnpm lint` — zero new errors/warnings.
5. **API AI smoke** (mock provider):

   ```bash
   AI_PROVIDER=mock pnpm --filter @st-manager/api dev
   bash apps/api/scripts/ai-smoke.sh
   ```

   Script should: login → `POST /ai/studios/summary` with sample studio → `{ success: true, data: { summary } }` with non-empty summary → unauthenticated call → `401`.

6. **Optional live provider check** (manual, not CI):

   ```bash
   AI_PROVIDER=openai AI_API_KEY=sk-... pnpm --filter @st-manager/api dev
   ```

   Repeat smoke or curl with real key.

7. **End-to-end (Definition of Done):**

   ```bash
   # Terminal 1 — API (mock or openai)
   AI_PROVIDER=mock pnpm --filter @st-manager/api dev

   # Terminal 2 — desktop
   pnpm --filter @st-manager/desktop tauri dev

   # Terminal 3 — web
   pnpm --filter @st-manager/web dev
   ```

   - Sign in on desktop and web.
   - Click **Generate summary** on a studio → non-empty summary text appears.
   - With `AI_PROVIDER=openai` and valid key → summary reflects real model output.

8. `pnpm build` (root) — no regression.
9. Auth/sync smoke scripts still pass (regression).

## 13. Definition of Done

- [ ] `packages/ai` exports one prompt, one provider adapter (OpenAI + mock), one pipeline; builds and typechecks.
- [ ] `POST /ai/studios/summary` implemented with contracts/validation alignment and JWT protection.
- [ ] `packages/api-sdk` exposes `createAiApi` with `generateStudioSummary`.
- [ ] Desktop and web Studios pages have **Generate summary** button producing visible AI text.
- [ ] Real provider call verified (OpenAI with key) OR mock provider verified for dev/smoke.
- [ ] `pnpm lint` and `pnpm build` pass; M12 packages typecheck in isolation.
- [ ] `docs/meeting-notes/M12-implementation-report.md` written at implementation time.
- [ ] Nothing committed until implementation report is reviewed and approved.

## 14. Next Recommended Milestone

**M13 — CI/CD and Hardening.** Formalize GitHub Actions, unit tests, and sustainable validation for everything built in M0–M12.

---

**Open decisions requiring explicit approval before implementation** (summarized for one-pass review):

1. **Feature slice:** **AI-generated studio summary** (ephemeral, not persisted) — recommended vs. **persist `summary` column on Studio** (requires migration + sync impact).

2. **AI provider:** **OpenAI primary + mock fallback** (recommended) vs. **mock only** (no real provider in M12) vs. **Anthropic primary**.

3. **Endpoint auth:** **JWT required** on `POST /ai/studios/summary` (recommended — cost control) vs. **public** (simpler demo, higher abuse risk).

4. **Client scope:** **Both desktop and web** (recommended — matches M7+M8 deps) vs. **web only** vs. **desktop only**.

5. **Prompt input:** **Request body `{ studioId, name }`** — use `name` for prompt, no DB lookup (recommended for M12 + desktop local-first) vs. **Server loads studio by id from DB** (404 if missing — simpler on web, blocks unsynced desktop studios).

6. **OpenAI adapter location:** **`openai` dependency in `packages/ai`** (recommended) vs. **adapter only in `apps/api`** (thinner ai package).

7. **Default dev provider:** **`AI_PROVIDER=mock` when `AI_API_KEY` unset** (recommended) vs. **fail fast if key missing**.

Stopping here per instructions — no source code, dependencies, scaffolding commands, or commits have been touched. Awaiting review and approval of this plan (and the seven decisions above) before implementing M12.
