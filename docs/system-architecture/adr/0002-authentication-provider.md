# ADR 0002: Authentication Provider

- Status: Deferred (open decision)
- Date: 2026-07-02

## Context

The frozen v3 architecture explicitly leaves the authentication provider as "TBD," with the following boundary reserved so implementation can proceed elsewhere without blocking on this decision:

| Layer | Auth touchpoint |
|-------|-----------------|
| `apps/api/src/modules/auth/` | Provider adapter + session/JWT issuance |
| `packages/api-sdk/client/` | Token injection, refresh hook (no provider logic) |
| `packages/contracts/auth/` | Login, refresh, session DTO shapes |
| `packages/validation/auth/` | Request/response parsers |

Candidate options for the eventual decision include a custom JWT implementation (full control, no external dependency, more implementation work), and managed providers such as Clerk or Auth0 (faster to implement, external dependency and cost, potential vendor lock-in).

## Decision

**No decision is made in this ADR.** Authentication is not required for milestones M0–M9 (repository hygiene, foundation packages, database, API bootstrap, first Studio feature vertical slice, UI foundation, desktop shell, web portal, logging/storage). The decision is scheduled for milestone M10 ("Auth Decision and Minimal Implementation"), once there are real endpoints and clients that need protecting.

This ADR exists to formally record that the gap is known and intentional, not an oversight, and to document the reserved touchpoints above so that M1–M9 code does not need to work around auth prematurely (for example, `packages/contracts/src/auth/` and `packages/validation/src/auth/` remain empty placeholders until M10).

## Consequences

- No auth middleware, guards, tokens, or user/session models are implemented before M10.
- Endpoints built in M5 (`POST/GET /studios`) will be unauthenticated until M10 lands.
- `packages/contracts/src/auth/` and `packages/validation/src/auth/` remain empty (only `.gitkeep`) until M10.
- This ADR should be updated (or superseded by ADR 0003) once the provider decision is actually made at M10.
