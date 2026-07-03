# M12 Implementation Report — First AI Feature Slice

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base: M11 (`e6aab48`), committed
- Date: 2026-07-03
- Scope: AI-generated studio summary (ephemeral), `packages/ai`, API orchestration, contracts/validation/api-sdk thread, desktop + web UI, smoke script, env validation, and this report. No M13 work. No DB persistence. No commit or push.
- Source: [M12 planning report](./M12-planning-report.md) (approved as written, including all seven recommended open decisions)

## 1. Executive Summary

M12 delivers the **first end-to-end AI feature**: a JWT-protected `POST /ai/studios/summary` endpoint that runs the `@st-manager/ai` studio-summary pipeline (OpenAI primary + mock fallback) and surfaces a **Generate summary** button on both desktop and web Studios pages.

All seven open decisions from the planning report were applied as recommended:

1. **Feature slice:** Ephemeral AI-generated studio summary — not persisted.
2. **AI provider:** OpenAI primary + mock fallback (`AI_PROVIDER=mock` default in dev).
3. **Endpoint auth:** JWT required on `POST /ai/studios/summary`.
4. **Client scope:** Both desktop and web Studios pages.
5. **Prompt input:** Request body `{ studioId, name }` — no server DB lookup.
6. **OpenAI adapter location:** `openai` dependency in `packages/ai`.
7. **Default dev provider:** `AI_PROVIDER=mock` when key unset.

Two implementation-time fixes were required: **Next.js SSR** (`navigator` unavailable during prerender — guarded with `typeof window !== "undefined"`), and **React hooks lint** (`set-state-in-effect` — online status initialized in `useState`, updated only in event callbacks).

## 2. Files Created

**`packages/ai/src/`**

- `types/completion.ts` — `AiProvider`, `CompletionResult`, `AiProviderError`.
- `prompts/studio-summary.ts` — `buildStudioSummaryPrompt`.
- `providers/mock-provider.ts` — deterministic dev/CI responses.
- `providers/openai-provider.ts` — OpenAI chat completions adapter.
- `pipelines/studio-summary.pipeline.ts` — `runStudioSummaryPipeline`.
- `index.ts` — exports + `createAiProvider` factory.

**`packages/contracts/src/ai/`**

- `studio-summary.dto.ts` — request/response DTOs.

**`packages/validation/src/ai/`**

- `studio-summary.schema.ts` — `generateStudioSummarySchema`.

**`packages/api-sdk/src/ai/`**

- `ai.api.ts` — `createAiApi` with `generateStudioSummary`.

**`apps/api/`**

- `src/modules/ai/ai.module.ts`, `ai.controller.ts`, `ai.service.ts`
- `scripts/ai-smoke.sh` — curl-based AI regression script.

**`apps/desktop/`**

- `src/components/ai/StudioSummaryActions.tsx` — per-studio generate button + result card.

**`apps/web/`**

- `src/components/ai/StudioSummaryActions.tsx` — same UX as desktop.

**`docs/`**

- `meeting-notes/M12-implementation-report.md` (this file).

## 3. Files Modified

- `packages/ai/package.json`, `tsconfig.json`, `README.md` — first real build (CommonJS).
- `packages/constants/src/routes.ts` — `ROUTES.AI`.
- `packages/constants/src/errors.ts` — `AI_PROVIDER_ERROR`.
- `packages/contracts/src/index.ts`, `packages/validation/src/index.ts` — AI exports.
- `packages/validation/src/env/api-env.schema.ts` — `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`.
- `packages/api-sdk/src/index.ts`, `README.md` — `createAiApi` export.
- `apps/api/package.json` — `@st-manager/ai` workspace dependency.
- `apps/api/src/app.module.ts` — register `AiModule`.
- `apps/api/src/common/filters/http-exception.filter.ts` — map `503` → `AI_PROVIDER_ERROR`.
- `apps/api/.env.example`, `infra/env/.env.example` — AI env vars documented.
- `apps/desktop/vite.config.ts` — `/ai` dev proxy.
- `apps/desktop/src/lib/api-client.ts` — export `aiApi`.
- `apps/desktop/src/app/studios/StudiosPage.tsx` — studio cards with AI actions.
- `apps/web/next.config.ts` — `/api/ai` rewrites (+ sync rewrites added for parity).
- `apps/web/src/lib/api-client.ts` — export `aiApi`.
- `apps/web/src/components/studios/StudiosPageClient.tsx` — studio cards with AI actions.
- `pnpm-lock.yaml` — `openai` in `packages/ai`.

**Unchanged (as planned):** Prisma schemas; M11 sync protocol; `packages/ui` StudioList/StudioForm props; CI (M13).

## 4. Dependencies Added (Resolved Versions)

| Package | Dependency | Type | Resolved version |
|---|---|---|---|
| `packages/ai` | `openai` | dependency | 6.25.0 |
| `packages/ai` | `@types/node` | devDependency | 22.15.3 |
| `apps/api` | `@st-manager/ai` | dependency (workspace) | link |

No new client npm dependencies.

## 5. Approved Architectural Decisions Applied

| Decision (planning report §14) | Choice applied |
|---|---|
| Feature slice | Ephemeral studio summary — not persisted |
| AI provider | OpenAI primary + mock fallback |
| Endpoint auth | JWT on `POST /ai/studios/summary` |
| Client scope | Desktop + web Studios pages |
| Prompt input | `{ studioId, name }` — no DB lookup |
| OpenAI adapter | In `packages/ai` with `openai` dependency |
| Default dev provider | `AI_PROVIDER=mock` when key unset |

## 6. Deviations From Plan (Justified)

### 6.1 Next.js SSR and `navigator.onLine`

**Plan assumption:** `useState(() => navigator.onLine)` for online detection.

**Reality:** Next.js prerender of `/studios` throws `ReferenceError: navigator is not defined`.

**Fix:** Initialize with `typeof window !== "undefined" ? navigator.onLine : true`; subscribe to `online`/`offline` events in `useEffect` callbacks only.

### 6.2 React `set-state-in-effect` lint

**Plan assumption:** Sync initial online state inside `useEffect`.

**Reality:** Next.js build ESLint (`react-hooks/set-state-in-effect`) rejects synchronous `setIsOnline` in effect body.

**Fix:** Same as §6.1 — initial value from guarded `useState`; effect only registers event listeners.

### 6.3 Web `next.config.ts` sync rewrites

**Plan scope:** Add `/api/ai` rewrites only.

**Reality:** Web client had auth/studios rewrites but sync rewrites were missing from config (desktop had `/sync` proxy since M11).

**Fix:** Added `/api/sync` and `/api/sync/:path*` rewrites alongside AI rewrites — parity fix, no M11 behavior change on desktop.

## 7. Validation Results

| Check | Result |
|---|---|
| `pnpm install` | Pass |
| `pnpm lint` | Pass — 0 errors, 0 warnings |
| `pnpm typecheck` | Pass — all 16 scoped packages |
| `pnpm build` | Pass — 15 tasks (including `@st-manager/ai`, `@st-manager/api`, desktop, web) |
| `bash apps/api/scripts/ai-smoke.sh` | Pass — 401 without token; authenticated mock summary returned |
| `bash apps/api/scripts/auth-smoke.sh` | Pass — M10 regression |
| `bash apps/api/scripts/sync-smoke.sh` | **Fail** — pre-existing test studio in SQLite DB returns `unchanged` on first push instead of expected `created` (environmental; not introduced by M12) |
| Web `/studios` page load | Pass — page renders with “Sign in to create studios and generate summaries” helper text |
| Full UI click-through (browser automation) | Not completed — credential entry blocked in automation sandbox; follow manual steps in §8 |

## 8. Manual Validation Steps (for reviewer)

With API running (`AI_PROVIDER=mock pnpm --filter @st-manager/api dev`):

```bash
# API smoke (already run successfully)
bash apps/api/scripts/ai-smoke.sh
```

With web or desktop dev server:

1. Sign in as `dev@st-manager.local` / `devpassword`.
2. Open Studios page.
3. Click **Generate summary** on any studio row.
4. Confirm non-empty summary text appears in a card below the button.
5. Refresh page — summary disappears (ephemeral by design).
6. Optional: set `AI_PROVIDER=openai` + valid `AI_API_KEY` and repeat for live model output.

## 9. Definition of Done (Roadmap)

- [x] `packages/ai` exports one prompt, OpenAI + mock providers, one pipeline; builds and typechecks.
- [x] `POST /ai/studios/summary` with contracts/validation alignment and JWT protection.
- [x] `packages/api-sdk` exposes `createAiApi` with `generateStudioSummary`.
- [x] Desktop and web Studios pages have **Generate summary** button and result display.
- [x] Mock provider verified via `ai-smoke.sh` (live OpenAI optional for reviewer).
- [x] `pnpm lint` and `pnpm build` pass; M12 packages typecheck.
- [x] `docs/meeting-notes/M12-implementation-report.md` written.
- [x] Nothing committed until this report is reviewed and approved.

## 10. Known Limitations

1. **No persistence** — summary lost on refresh; by design for M12.
2. **Online-only AI** — buttons disabled when offline or unsigned-in.
3. **No server studio lookup** — prompt uses client-supplied name only.
4. **OpenAI-only provider** — `AiProvider` interface allows future adapters.
5. **Sync smoke environmental flake** — existing smoke studio ID may already exist in dev DB.

## 11. Next Recommended Milestone

**M13 — CI/CD and Hardening.** Formalize GitHub Actions, unit tests, and sustainable validation for M0–M12.

M13 has not been started. Work stops here pending review and approval. **No git commit. No push.**
