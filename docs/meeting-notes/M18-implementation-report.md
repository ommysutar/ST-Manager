# M18 Implementation Report — Billing & Invoices

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base: M17 (`e267b71`), committed
- Date: 2026-07-03
- Scope: Invoice model + dual migrations, NestJS `invoices` module with lifecycle transitions, contracts/validation/api-sdk/types thread, web Billing UI, session conversion entry point, live dashboard billing widgets, desktop dashboard widgets only, invoices smoke + PostgreSQL CI extension, and this report. No commit or push.
- Source: Approved Phase 3 master plan ([M14 planning report §4](./M14-planning-report.md), [phase3-roadmap.md](../roadmap/phase3-roadmap.md))

## Validation Results

| Check | Result |
|---|---|
| `pnpm lint` | Pass — 0 errors, 0 warnings |
| `pnpm typecheck` | Pass — 16 packages |
| `pnpm test` | Pass — **83 tests** (validation **34** incl. 4 invoice, utils 5, api-sdk **13** incl. 2 invoice, api **31** incl. 8 invoice + 2 dashboard) |
| `pnpm build` | Pass — 15 tasks (web, desktop, api, packages) |
| `bash apps/api/scripts/invoices-smoke.sh` | Pass — 401 without token; CRUD lifecycle; session conversion; duplicate session 409; dashboard revenue |
| `bash apps/api/scripts/ci-smoke.sh` | Pass — auth + sync + AI + dashboard + clients + bookings + sessions + **invoices** smokes |

## Preview Pages to Test

| URL | What to verify |
|---|---|
| `/billing` | Invoice list with status filter; links to detail |
| `/billing/new` | Create ad hoc invoice with client, line items, tax rate |
| `/billing/new?sessionId={id}` | Prefilled invoice from completed session |
| `/billing/[id]` | Edit draft, send, mark paid, void, print/PDF view |
| `/sessions/[id]` | “Create invoice from session” / “View invoice” on completed sessions |
| `/` (dashboard) | Live month revenue, outstanding balance, billing lists |
| Desktop dashboard | Read-only billing widgets (web-only management copy) |

---

M18 has not been committed. Work stops here pending review and approval. **No git commit. No push.**
