# ST Manager

**Recording Studio Operating System**

> **Document status:** Living architecture reference — last aligned with codebase July 2026 (Sprint 4: Studios, Bookings & Calendar).  
> **Rule:** Update this file whenever architecture, data ownership, or module boundaries change.

---

# Vision

ST Manager is **not a CRM**.

It is a **complete operating system built specifically for recording studios** — covering the full lifecycle from first client contact through delivery, payment, and reporting. Every feature exists to answer one question: *“What is the state of this studio project right now?”*

Unlike generic CRMs that treat contacts as the center of gravity, ST Manager treats **Projects** as the center. Clients, inquiries, bookings, payments, files, tasks, and documents all orbit a single Project entity. A studio owner should be able to open any project and see everything — work in progress, money owed, studio time booked, files shared, and delivery status — without jumping between disconnected tools.

**Target users:** Recording studio owners, assistants, and engineers.

**Design intent:** Functionality first. Professional, minimal UI. Recording-studio workflows (inquiry → quotation → project → sessions → payment → delivery) over generic business software patterns.

---

# Core Philosophy

## Project is the single source of truth

All operational data for a studio engagement ultimately belongs to one **Project**. Financial totals, task progress, booking links, payment history, and document references are owned by or resolved through the Project. No module maintains a parallel copy of project business data.

## No duplicate business data

- Payment amounts are stored once in the **payment ledger**; Project cached fields (`advanceReceived`, `remainingBalance`) are derived.
- Quotation/Invoice **documents are pointers**, not snapshots — line items are resolved live from the Project/Inquiry quotation so edits propagate everywhere.
- Client contact details on a Project are denormalized for display but link back to the API Client when `clientId` is set.

## Every module connects to Project

| Module | Connection |
|--------|------------|
| Inquiry | Becomes a Project on conversion; retains `inquiryId` link |
| Bookings | `projectId` required |
| Payments | `projectId` required |
| Documents | `projectId` and/or `inquiryId` |
| Tasks | Embedded in `StudioProject.tasks[]` |
| Files & Links | Embedded in `StudioProject.files[]` / `links[]` |

## Reusable components only

Shared UI and logic must not be duplicated. Example: `ReceivePayment` is used in both Payment Overview and the Inquiry Wizard Advance Payment step — one component, one `addPayment()` code path.

## Clean architecture

- **Domain logic** lives in `apps/web/src/lib/{module}/` (storage, types, events, pure functions).
- **React hooks** subscribe to storage via `useSyncExternalStore` + custom events.
- **Components** are presentational orchestrators; they do not own business rules.
- **API layer** (`apps/api`) handles auth, persistent clients, and legacy Phase 3 domains separately until migration.

## Scalable modules

Each domain is a self-contained folder: `types.ts`, `storage.ts`, `events.ts`, `snapshots.ts`, optional `constants.ts` / `view-model.ts`, and a matching `hooks/use{Module}.ts`.

---

# Workflow

End-to-end studio workflow as designed and partially implemented:

```
Dashboard
    ↓
New Inquiry
    ↓
Save Inquiry                    ← status: "inquiry" (no project yet)
    ↓
Make Quotation                  ← QTN-0001 generated (optional before conversion)
    ↓
Client Approval                 ← manual / offline (not automated in V1)
    ↓
Convert to Project              ← explicit user action in wizard step 6
    ↓
Advance Payment (optional)      ← ReceivePayment component
    ↓
Project Workspace               ← tasks, files, bookings, payments, documents
    ↓
Bookings                        ← studio room + date + slot
    ↓
Payments                        ← cash / UPI ledger
    ↓
Files Shared                    ← uploads + external links on project
    ↓
Project Completed               ← delivery + payment + files (see Business Rules)
```

### Current implementation notes

| Step | Status |
|------|--------|
| Dashboard → New Inquiry | ✅ Implemented |
| Save Inquiry | ✅ Implemented — does **not** create a Project |
| Make Quotation | ✅ Implemented — idempotent `getOrCreateQuotation()` |
| Client Approval | ⚠️ Manual only — no approval workflow UI |
| Convert to Project | ✅ Implemented — wizard step 6, `createProjectFromInquiry()` |
| Advance Payment | ✅ Implemented — shared `ReceivePayment` |
| Project Workspace | ✅ Implemented — tabs: Overview, Task Flow, Bookings, Payment, Files, Timeline |
| Bookings | ✅ Implemented — local slot-based bookings |
| Payments | ✅ Implemented — ledger + Payment Overview |
| Files Shared | ✅ Implemented — cloud-link metadata (no binary storage) + dedicated "Files Shared" mandatory task |
| Project Completed | ✅ Implemented — full rule engine: all tasks done + fully paid → `completed` (see Business Rules) |

---

# Main Modules

## Dashboard (`/`)

**Purpose:** Lightweight command center — start work, see what needs attention.

**Current implementation:**
- Primary actions: **+ New Inquiry**, **+ New Project**
- Widgets: **Project Status** (active projects, current task, progress %, **Booking Today** badge), **Payment Status** (pending amounts, links to Payment Overview), **Bookings** (today + upcoming project bookings)
- **Global Search** in header (not a dashboard widget)
- No KPI charts or analytics cards

---

## Inquiry (`/inquiries`)

**Purpose:** Capture client intent, services, and quotation before committing to a project.

**Key features:**
- 6-step wizard: Client → Project → Plans → Services → Decision → Advance Payment
- Draft auto-save to `st-manager-inquiry-wizard-draft`
- Inquiry numbering: `INQ-0001`
- Tiered service pricing (Basic / Standard / Premium)
- Custom services, studio rent (hours × hourly rate), manual discount %
- **Save Only Inquiry** vs **Add To Project** decision at step 5
- **Make Quotation** from inquiry list or detail page

**Storage:** `st-manager-inquiries` (localStorage)

**Does not:** Auto-create a Project on save.

---

## Projects (`/projects`)

**Purpose:** Single source of truth for all studio work after conversion — the primary operating
workspace of ST Manager (Sprint 3).

**Key features:**
- Project numbering: `PRJ-0001`
- Source: `inquiry` | `manual`
- Project List: **Active Projects** / **Completed Projects** tabs + search across number, name,
  client, category, engineer, and status (`filterProjectsBySearch()`)
- Auto-generated **Task Flow** from selected services + three mandatory tasks: **Payment**,
  **Files Shared**, **Project Delivery** (never deletable, always present — see Business Rules)
- Project Workspace tabs: Overview, Task Flow, Bookings, Payments, Files & Links, Project
  Expenses, Timeline (placeholder), Notes
- Financial fields synced from payment ledger; the "Payment" task auto-syncs from
  `remainingBalance` so it never drifts from the ledger
- Project Expenses (internal-only, owner-visible profit calculation)
- Files & Links store cloud-storage metadata only (Google Drive / Dropbox / OneDrive / Other) —
  no binary data is ever persisted in ST Manager
- Links: `inquiryId`, `clientId`, `bookingIds[]`, future `sessionIds[]`, `invoiceIds[]`

**Storage:** `st-manager-projects` (localStorage)

---

## Clients (`/clients`)

**Purpose:** Persistent client contact database.

**Current implementation:** API-backed (Prisma `Client` model). CRUD via NestJS `/clients`.

**Connection to Projects:** Optional `clientId` on `StudioProject` when wizard selects an existing client. Client profile shows aggregated payments summary via `useClientPaymentsSummary`.

**Future target:** Full bidirectional sync — all inquiry/project client data resolves through API Client record.

---

## Bookings (`/bookings`)

**Purpose:** Schedule studio room time against projects.

**Current implementation (V1 — local):**
- **ProjectBooking**: `projectId` (required) + local **StudioRoom** + date + slot
- Status: `draft` | `booked` | `completed` | `cancelled` (legacy `confirmed` migrates to `booked`)
- Default slots: 11 AM–2 PM, 3 PM–6 PM, 7 PM–9 PM; owner can add custom slots in Settings → Studios
- Conflict detection: one occupying booking per studio/date/slot (`isSlotAvailable()` — error: "Studio already booked.")
- Week view at `/bookings`: seven-day horizontal layout, prev/next week navigation, drag-and-drop reschedule
- Booking wizard loads studios dynamically from `st-manager-studios`

**Storage:** `st-manager-project-bookings` (bookings), `st-manager-booking-slots` (custom slots)

**Legacy parallel track:** API `/bookings` (datetime range, Prisma `Booking`) — `/calendar/*` routes redirect to `/bookings`; API track **not synced** with local project bookings.

**Future target:** Unified booking model on Project, backed by database.

---

## Payments (`/payments`)

**Purpose:** Financial center — track what is owed and received per project.

**Key features:**
- Hub with search + All / Projects / Clients tabs
- **Payment Overview** per project: value, received, pending, progress bar, editable service lines, payment history
- **Receive Payment:** Cash or UPI (QR from owner profile, manual verification)
- **Documents:** Generate/view Quotation and Invoice from overview
- Payment status: `pending` | `partial` | `paid` | `no_charge`

**Storage:** `st-manager-payments` (localStorage ledger)

**Source of truth:** Payment ledger. Project `advanceReceived` / `remainingBalance` are **derived** via `syncProjectBalance()`.

**Legacy parallel track:** API `/billing` + Prisma `Invoice` (USD, session-linked) — routes exist but nav points to local Payments module.

---

## Reports (`/reports`)

**Purpose:** Studio analytics and exports.

**Current implementation:** API-backed — revenue, utilization, client reports, CSV export (`GET /reports/*`).

**Future target (Sprint 5):** Aggregate from local payment ledger + project data for studio-native reports (INR, project-level revenue, engineer utilization).

---

## Settings (`/settings`)

**Purpose:** Owner configuration panel.

| Sub-route | Purpose | Storage |
|-----------|---------|---------|
| `/settings/studios` | Studio rooms for bookings | localStorage `st-manager-studios` |
| `/settings/services` | Service catalog + tiered pricing | localStorage `st-manager-service-pricing` |
| `/settings/projects` | Inquiry plan tiers (comparison only) | localStorage `st-manager-project-plans` |
| `/settings/template` | Invoice & Quotation branding | localStorage `st-manager-studio-profile` |

**Profile Menu (header):** Same `StudioProfile` storage — photo, studio name, UPI QR, signature, logo, contact fields.

---

## Future Modules

| Module | Status | Notes |
|--------|--------|-------|
| **Sessions** | API exists (`/sessions`); UI at `/sessions` | Not linked to V1 Project workspace |
| **Timeline** | Placeholder tab on project detail | Target: aggregate tasks, bookings, payments, sessions (Sprint 4+) |
| **Engineer assignment / RBAC** | Login roles exist; UI gating partial (owner-only Profit) | Target: server-enforced permissions per module |
| **Notifications** | Not implemented | Email/SMS, calendar sync |
| **GST on documents** | Field exists on profile | Not applied to totals yet |
| **Desktop offline sync** | Tauri app + sync API scaffold | Clients/studios only in desktop V1 |
| **Real cloud provider integration** | Metadata-only links today (Sprint 3) | Target: OAuth picker for Google Drive/Dropbox/OneDrive instead of pasted URL |

---

# Project Architecture

The **Project** (`StudioProject`) is the hub. Everything operational attaches here.

```
StudioProject
├── Identity        projectNumber, projectName, clientName, clientId?, inquiryId?
├── Status          active | on_hold | delivered | completed | cancelled
├── Financials      grandTotal, advanceReceived, remainingBalance (derived)
├── Quotation       QuotationBreakdown (editable service lines)
├── Task Flow       ProjectTask[] — auto-generated + custom + 3 mandatory tasks
├── Bookings        bookingIds[] → ProjectBooking
├── Payments        PaymentRecord[] (by projectId in ledger)
├── Documents       StudioDocument[] (quotation + invoice pointers)
├── Files & Links   ProjectFile[] (cloud metadata only), ProjectLink[]
├── Expenses        ProjectExpense[] — internal only, owner-only profit view
├── Timeline        (future — aggregated view)
├── Notes           free-text project notes
└── Future links    sessionIds[], invoiceIds[] (API legacy)
```

## Project workspace tabs

| Tab | Data source | Route shortcut |
|-----|-------------|----------------|
| Overview | Project + client + progress + bookings + payments + files (live, read-only) | `/projects/[id]` |
| Task Flow | `project.tasks[]` — drag & drop, add/edit/delete/duplicate | same |
| Bookings | `listBookingsByProject()` + "Open Booking" → `/bookings/[id]` | same |
| Payments | Project financials + recent transactions + "Open Payments" | `/payments/[projectId]` |
| Files & Links | `project.files[]` (cloud metadata), `project.links[]` | same |
| Project Expenses | `project.expenses[]` + profit calc (owner-only) | same |
| Timeline | Placeholder | same |
| Notes | `project.notes` | same |

## Mandatory task automation (Sprint 3)

Every project always has three tasks that cannot be deleted (only reordered):
`Payment` → `Files Shared` → `Project Delivery` (`ProjectTask.mandatoryKey`).

- **Payment** is auto-synced from `project.remainingBalance` — its checkbox is disabled in the UI
  and flips automatically when the payment ledger reaches zero. This keeps the task flow and the
  financial ledger from ever diverging.
- **Project Delivery** completion moves the project to `delivered`.
- Completing **every** task while fully paid moves the project to `completed` and it automatically
  appears under the "Completed Projects" tab on the Projects list.
- `evaluateProjectCompletion()` in `lib/projects/storage.ts` is the single rule engine — it runs
  after every task edit (`ProjectTaskFlow`) and after every payment (`syncProjectBalance()` in
  `lib/payments/storage.ts`). `on_hold` / `cancelled` remain manual-only statuses.
- Legacy projects are migrated on load: the old single "Final Delivery" task is converted in place
  into the "Project Delivery" mandatory task (`ensureMandatoryTasks()` in `lib/projects/tasks.ts`),
  preserving existing completion state.

## Rule: No module duplicates Project information

- Payments module reads/writes ledger, then syncs Project — never stores a second copy of totals outside Project + ledger.
- Documents resolve quotation live — never store duplicate line items.
- Dashboard widgets read Project list — no separate dashboard state.
- Client payments summary is computed from Projects + Documents — not stored separately.

---

# Database Relationships

ST Manager currently operates on **two data tracks**. This section documents both.

## Track A — Prisma / PostgreSQL (API — production path)

```
┌─────────┐       ┌─────────┐       ┌─────────┐
│  User   │       │ Studio  │       │ Client  │
│─────────│       │─────────│       │─────────│
│ id      │       │ id      │       │ id      │
│ email   │       │ name    │       │ name    │
│ role    │       └────┬────┘       │ phone   │
└─────────┘            │            │ email   │
                       │            └────┬────┘
                       │                 │
              ┌────────┴────────┐        │
              │                 │        │
         ┌────▼────┐      ┌─────▼────┐   │
         │ Booking │      │ Session  │   │
         │─────────│      │──────────│   │
         │ studioId│      │ studioId │   │
         │ clientId│◄─────│ clientId │◄──┘
         │ startAt │      │ bookingId│
         │ endAt   │      │ status   │
         └─────────┘      └────┬─────┘
                               │
                         ┌─────▼─────┐
                         │  Invoice  │
                         │───────────│
                         │ clientId  │
                         │ sessionId?│
                         │ lineItems │
                         │ total     │
                         └───────────┘
```

**Models:** `User`, `Studio`, `Client`, `Booking`, `Session`, `Invoice`  
**Schema:** `packages/database/prisma/postgresql/schema.prisma` (SQLite mirror for dev)

**Not in Prisma (yet):** Inquiry, Project, PaymentRecord, StudioDocument, ProjectBooking, ProjectTask, ProjectExpense, StudioProfile, StudioService.

---

## Track B — Browser localStorage (V1 studio workflow — active product direction)

```
┌──────────────┐         ┌─────────────────┐
│ SavedInquiry │────────►│  StudioProject  │◄──────┐
│──────────────│ convert │─────────────────│       │
│ inquiryNumber│         │ projectNumber   │       │
│ form         │         │ quotation       │       │
│ quotation    │         │ tasks[]         │       │
│ projectId?   │         │ files[], links[]│       │
└──────┬───────┘         │ bookingIds[]    │       │
       │                 │ clientId?       │       │
       │                 └────────┬────────┘       │
       │                          │                │
       │            ┌─────────────┼─────────────┐  │
       │            │             │             │  │
       ▼            ▼             ▼             ▼  │
┌─────────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐
│StudioDocument│ │Payment   │ │Project    │ │ StudioProfile│
│─────────────│ │Record    │ │Booking    │ │ (per user)   │
│ type: QTN/  │ │──────────│ │───────────│ └──────────────┘
│   INV       │ │projectId │ │projectId  │        │
│ inquiryId?  │ │amount    │ │studioId   │        ▼
│ projectId?  │ │method    │ │date, slot │   DocumentTemplate
└─────────────┘ └──────────┘ └───────────┘   (live view-model)

┌──────────────┐     ┌──────────────┐
│ StudioService│     │  StudioRoom  │
│ (pricing)    │     │ (settings)   │
└──────────────┘     └──────────────┘

┌──────────────┐
│ Client (API) │──── optional clientId on StudioProject
└──────────────┘
```

### Entity quick reference

| Entity | ID format | Storage key | Belongs to |
|--------|-----------|-------------|------------|
| SavedInquiry | `inq_*` | `st-manager-inquiries` | — |
| StudioProject | `prj_*` | `st-manager-projects` | — |
| ProjectTask | `task_*` | embedded in project | Project |
| ProjectFile | `file_*` | embedded in project (`files[]`) | Project — cloud metadata only |
| ProjectLink | `lnk_*` | embedded in project (`links[]`) | Project |
| ProjectExpense | `exp_*` | embedded in project (`expenses[]`) | Project |
| PaymentRecord | `pay_*` | `st-manager-payments` | Project (`projectId`) |
| StudioDocument | `doc_*` | `st-manager-documents` | Inquiry and/or Project |
| ProjectBooking | `bkg_*` | `st-manager-project-bookings` | Project (`projectId`) |
| StudioProfile | per `userId` | `st-manager-studio-profile` | User |
| StudioRoom | `studio_*` | `st-manager-studios` | Settings |
| StudioService | service id | `st-manager-service-pricing` | Settings |
| Client | cuid | Prisma DB | API |

### Number sequences

| Type | Pattern | Example |
|------|---------|---------|
| Inquiry | `INQ-{4}` | INQ-0001 |
| Project | `PRJ-{4}` | PRJ-0001 |
| Quotation | `QTN-{4}` | QTN-0001 |
| Invoice (local) | `INV-{4}` | INV-0001 |

---

## Future target — unified database

Migrate Track B entities to Prisma with explicit foreign keys:

```
Client ──< StudioProject >── StudioRoom (bookings)
                │
                ├──< PaymentRecord
                ├──< StudioDocument
                ├──< ProjectTask
                ├──< ProjectFile / ProjectLink
                └──< ProjectExpense (future)

SavedInquiry ──(1:1 optional)── StudioProject
User / Engineer ── assignedEngineer (string → FK future)
```

---

# Business Rules

Rules marked **✅ Current** are enforced in code today. **🎯 Target** are architectural intent not yet fully implemented.

## Inquiry & Project

| Rule | Status |
|------|--------|
| Saving an inquiry does **not** create a project automatically | ✅ Current — `handleSaveInquiry()` sets `status: "inquiry"` only |
| Project creation requires explicit **Convert to Project** / wizard step 6 | ✅ Current |
| One inquiry links to at most one project (`inquiry.projectId`) | ✅ Current |
| Manual projects can be created without an inquiry (`source: "manual"`) | ✅ Current |
| Client approval before project creation | 🎯 Target — currently manual/offline |

## Quotation & Documents

| Rule | Status |
|------|--------|
| Plans (Basic/Standard/Professional) are **comparison only** — not added to quotation total | ✅ Current — `planAmount: 0` in `calculateQuotation()` |
| Quotation uses selected services + custom services + studio rent + discount % | ✅ Current |
| `getOrCreateQuotation()` is idempotent per inquiry/project | ✅ Current |
| `getOrCreateInvoice()` is one invoice per project (idempotent) | ✅ Current |
| Document line items resolve **live** from project/inquiry quotation | ✅ Current — `buildDocumentViewModel()` |
| Owner can edit service line amounts on Payment Overview → recalculates project, documents, balance | ✅ Current — `updateProjectServiceLineAmount()` |

## Bookings

| Rule | Status |
|------|--------|
| Every booking belongs to exactly one Project | ✅ Current — `ProjectBooking.projectId` required |
| One occupying booking per studio room / date / slot (draft, booked, completed) | ✅ Current — `isSlotAvailable()` |
| Booking statuses: draft, booked, completed, cancelled | ✅ Current (Sprint 4) |
| Drag-and-drop reschedule updates date + slot | ✅ Current (Sprint 4) |
| Creating a booking appends ID to `project.bookingIds[]` | ✅ Current |

## Payments

| Rule | Status |
|------|--------|
| Every payment belongs to exactly one Project | ✅ Current — `PaymentRecord.projectId` required |
| Payment ledger is source of truth; project balances are derived | ✅ Current — `syncProjectBalance()` |
| Advance payment at project creation uses same `addPayment()` as manual payments | ✅ Current — `source: "advance"` vs `"manual"` |
| UPI payments require manual owner verification | ✅ Current — “Verified Payment” button |
| Cash and UPI share one `ReceivePayment` component | ✅ Current |

## Files

| Rule | Status |
|------|--------|
| Files and links belong to Project (`files[]`, `links[]`) | ✅ Current |
| Files are cloud-storage pointers only — name, type, size, cloud URL, upload date, uploader | ✅ Current (Sprint 3) — `addProjectCloudFile()` in `lib/projects/assets.ts` |
| ST Manager never stores the file binary itself | ✅ Current — legacy data-URL entries are migrated to the metadata shape on load (`normalizeLegacyFile()`) |
| Supported providers: Google Drive, Dropbox, OneDrive, Other (extensible) | ✅ Current |

## Tasks

| Rule | Status |
|------|--------|
| Tasks auto-generated from selected services on project creation | ✅ Current — `generateTasksFromServices()` |
| Every project always ends with Payment → Files Shared → Project Delivery | ✅ Current (Sprint 3) — `ensureMandatoryTasks()` |
| Completing "Project Delivery" sets project status to `delivered` | ✅ Current — `evaluateProjectCompletion()` |
| Any task can be Added, Edited, Duplicated, Deleted, or Drag & Drop reordered | ✅ Current (Sprint 3) |
| The three mandatory tasks (Payment, Files Shared, Project Delivery) can be reordered but never deleted | ✅ Current — `isTaskDeletable()` gates the delete button |
| "Payment" task checkbox is disabled and auto-synced from the payment ledger | ✅ Current — `syncPaymentTaskState()` |
| Completing/un-completing a task stamps/clears `completedDate` | ✅ Current |

## Project completion

| Rule | Status |
|------|--------|
| Project marked `delivered` when "Project Delivery" task completed | ✅ Current |
| Project `completed` only when: all tasks done + full payment received (which implies Files Shared + Project Delivery are done, since they are tasks) | ✅ Current (Sprint 3) — `evaluateProjectCompletion()` |
| Completed projects automatically move to the "Completed Projects" tab on the Projects list | ✅ Current — `filterCompletedProjects()` |
| `on_hold` / `cancelled` are manual-only statuses, never auto-overridden | ✅ Current |
| Full completion gate with UI confirmation dialog | 🎯 Target — currently silent/automatic |

## Roles

| Rule | Status |
|------|--------|
| Owner, Assistant, Engineer login roles | ✅ Current — seeded users, role picker |
| Owner-only: template editor, service price edits, profile branding uploads | ✅ Current — UI gating |
| Server-side or localStorage role enforcement | 🎯 Target — UI-only today |

---

# Dashboard Rules

The Dashboard stays **lightweight**. It answers: *What should I do next?* and *What needs attention?*

## Must contain

| Element | Location | Status |
|---------|----------|--------|
| + New Inquiry | Dashboard buttons | ✅ |
| + New Project | Dashboard buttons | ✅ |
| Project Status widget | Dashboard — active projects, task, progress % | ✅ |
| Payment Status widget | Dashboard — pending amounts, links to `/payments/[id]` | ✅ |
| Global Search | Header (all authenticated pages) | ✅ |

## Should contain (target)

| Element | Status |
|---------|--------|
| Bookings widget (today + upcoming project bookings) | ✅ |

## Must NOT contain

- Revenue KPI cards
- Charts / analytics graphs
- Duplicate project lists with full detail
- API dashboard summary widgets (legacy M14 — replaced by local widgets)

---

# Coding Standards

## Reuse components

- One payment UI: `components/payments/ReceivePayment.tsx`
- One document renderer: `components/documents/DocumentTemplate.tsx`
- One quotation summary: `components/inquiry/wizard/QuotationSummary.tsx`
- Shared profile/template fields: `StudioProfile` storage (Profile Menu + Template Editor)

## Never duplicate APIs

- HTTP calls go through `@st-manager/api-sdk` factories in `lib/api-client.ts`
- Domain CRUD goes through `lib/{module}/storage.ts` — not inline localStorage in components

## Never duplicate state

- Use `useSyncExternalStore` hooks (`useProjects`, `usePayments`, etc.)
- Persist → emit event → hook refreshes snapshot
- Do not copy project/payment totals into component `useState` as authoritative data

## Prefer composition

- Page clients orchestrate; domain libs calculate; UI components render
- Cross-module reads: import storage getters, not duplicate queries

## Keep modules independent

- `lib/payments/` must not import from `components/`
- `lib/documents/view-model.ts` may read `lib/projects/` and `lib/payments/` — dependency flows inward
- Events are module-specific; cross-module refresh happens because payment sync calls `updateProject()` which emits `PROJECTS_UPDATED_EVENT`

## Currency & locale

- Studio workflow amounts: **INR** via `formatINR()` (`lib/currency.ts`)
- API invoices (legacy billing): USD — will converge to INR on migration

## ID generation

```typescript
generateId("prj") // → prj_{timestamp36}_{random}
```

Defined in `lib/inquiry/services.ts`.

---

# Folder Structure

## Monorepo root

```
ST-MANAGER/
├── apps/
│   ├── web/          ← Primary studio portal (Next.js 15)
│   ├── api/          ← NestJS REST API
│   └── desktop/      ← Tauri shell (subset of web features)
├── packages/
│   ├── database/     ← Prisma schemas + seed scripts
│   ├── contracts/    ← Shared DTOs
│   ├── api-sdk/      ← Typed HTTP client
│   ├── validation/   ← Zod schemas for API
│   ├── ui/           ← Shared React components (shadcn-style)
│   ├── theme/        ← Design tokens
│   └── …             ← config-*, types, constants, ai, logging
├── docs/             ← Milestone reports, ADRs, testing checklists
└── ST_MANAGER_ARCHITECTURE.md   ← This file
```

## Web app (`apps/web/src/`)

```
app/                    Routes (Next.js App Router)
├── page.tsx            Dashboard
├── inquiries/          Inquiry list, wizard, detail
├── projects/           Project list, create, detail
├── clients/            API client CRUD
├── bookings/           Local project bookings calendar
├── payments/           Payment hub + overview + client view
├── documents/[id]/     Quotation / invoice viewer
├── settings/           Services, plans, studios, template
├── billing/            Legacy API invoices (not in nav)
├── sessions/           Legacy API sessions (not in nav)
└── reports/            API reports

components/             UI by domain
├── shell/              AppShell, Header, Sidebar, nav-items
├── inquiry/            Wizard + list + detail
├── projects/           Detail, tasks, files, bookings tab
├── payments/           Hub, overview, ReceivePayment
├── documents/          DocumentTemplate, viewer
├── bookings/           Week calendar
├── dashboard/          Widgets
├── settings/           Owner configuration pages
├── profile/            ProfileMenu, ProfileSettingsDialog
├── search/             GlobalSearch
└── auth/               LoginActions (role picker)

hooks/                  useSyncExternalStore wrappers
├── useProjects.ts
├── usePayments.ts
├── useDocuments.ts
├── useBookings.ts
├── useProfile.ts
├── useInquiryStorage.ts
└── useClientPaymentsSummary.ts

lib/                    Domain logic (no React)
├── inquiry/            schema, storage, quotation, services, plans
├── projects/           storage, tasks, progress, filters, assets
├── payments/           storage, status, events
├── documents/          storage, view-model, events
├── bookings/           storage, slots, events
├── profile/            storage, types, events
├── studios/            storage, constants (local rooms)
├── search/             global-search
├── api-client.ts       API SDK wiring
└── token-store.ts      JWT localStorage

styles/
└── globals.css
```

## API app (`apps/api/src/`)

```
modules/
├── auth/           JWT login + refresh
├── clients/        Client CRUD
├── bookings/       API calendar bookings
├── sessions/       Session lifecycle
├── invoices/       Legacy billing
├── dashboard/      Summary KPIs
├── reports/        Analytics + CSV export
├── studios/        API studio list
├── sync/           Desktop sync
├── ai/             Studio summary
└── health/
```

## Storage & events pattern (local modules)

Every local domain follows:

```
lib/{module}/
├── types.ts        Entity interfaces + STORAGE_KEY constant
├── storage.ts      read/write localStorage, CRUD, business rules
├── events.ts       notify{Module}Updated() + EVENT constant
└── snapshots.ts    in-memory snapshot for useSyncExternalStore

hooks/use{Module}.ts   subscribe to EVENT, return snapshot
```

### localStorage keys (complete list)

| Key | Module |
|-----|--------|
| `st-manager-inquiry-wizard-draft` | Inquiry wizard |
| `st-manager-inquiries` | Inquiries |
| `st-manager-projects` | Projects |
| `st-manager-payments` | Payments |
| `st-manager-documents` | Documents |
| `st-manager-project-bookings` | Bookings |
| `st-manager-booking-slots` | Custom booking slots |
| `st-manager-studio-profile` | Profile / template |
| `st-manager-studios` | Studio rooms |
| `st-manager-service-pricing` | Services |
| `st-manager-project-plans` | Plans |
| `st-manager.accessToken` | Auth |
| `st-manager.refreshToken` | Auth |
| `st-manager.user` | Auth |

### Custom events

| Event | Emitted when |
|-------|--------------|
| `st-manager-inquiries-updated` | Inquiry CRUD |
| `st-manager-projects-updated` | Project CRUD |
| `st-manager-payments-updated` | Payment recorded |
| `st-manager-documents-updated` | Document created |
| `st-manager-bookings-updated` | Booking CRUD |
| `st-manager-booking-slots-updated` | Custom slot CRUD |
| `st-manager-profile-updated` | Profile saved |
| `st-manager-studios-updated` | Studio room CRUD |
| `st-manager-service-pricing-updated` | Service CRUD |
| `st-manager-project-plans-updated` | Plan CRUD |

---

# UI Principles

1. **Simple** — One primary action per screen region. No clutter.
2. **Professional** — Clean typography, consistent spacing, print-ready documents.
3. **Minimal** — No decorative analytics. Show what the studio needs to act.
4. **Recording-studio focused** — Language and flows match studio operations (inquiry, quotation, session, delivery, mix, master).
5. **Functionality first** — Ship working workflows before visual polish.
6. **Design later** — Use `@st-manager/ui` tokens; refine aesthetics incrementally.

### Document design

Quotation and Invoice share one template (`DocumentTemplate.tsx`). Invoice replaces heading with “INVOICE” and adds Payment Summary. Branding comes from `StudioProfile` / Template Editor.

### Responsive behavior

- Sidebar navigation on desktop; collapsible on mobile
- Global Search hidden below `md` breakpoint (known hydration consideration)
- Print styles on document pages (`print:` Tailwind utilities)

---

# Search Rules

**Global Search** lives in the header (`components/search/GlobalSearch.tsx`).

## Searches across

| Type | Source | Matches on |
|------|--------|------------|
| Client | API (`fetchAllClients`) | name, email, phone, company |
| Project | localStorage | project name, number, client name, mobile, email |
| Inquiry | localStorage | inquiry number, client, project name, mobile, email |
| Booking | localStorage | project name, client name, studio name, booking label, date |
| Payment | localStorage (derived) | project name, number, client name |

## Behavior

- Instant results as user types (client-side filter)
- Click result → navigate to entity page
- Payment results link to `/payments/[projectId]`
- Implementation: `lib/search/global-search.ts`

## Does not search (current)

- Individual payment transactions
- Document numbers (QTN/INV)
- Settings / services catalog
- API sessions or API invoices

## Project List search (separate from Global Search)

The Projects page (`/projects`) has its own local search box — distinct from the header's Global
Search — scoped to the Active/Completed tab currently selected. It matches Project Number, Project
Name, Client Name, Category, Assigned Engineer, and Status label. Implementation:
`filterProjectsBySearch()` in `lib/projects/filters.ts`.

---

# Future Roadmap

Sprint numbering reflects product increments on top of the committed Phase 3 API foundation (M14–M19).

## Sprint 1 — Core Foundation ✅ Completed

| Feature | Status |
|---------|--------|
| Global Search (clients, projects, inquiries, bookings, payments) | ✅ |
| Login roles (Owner, Assistant, Engineer) | ✅ |
| Owner Profile Menu + studio branding fields | ✅ |
| Client search in Inquiry Wizard (full database, duplicate validation) | ✅ |
| Tiered service pricing (Basic / Standard / Premium) | ✅ |
| Custom services + studio rent + manual discount | ✅ |
| Dashboard: Project Status + Payment Status widgets | ✅ |
| Inquiry numbering (INQ-0001) | ✅ |

**Architecture outcome:** Project established as SSOT; localStorage domain modules with event-driven hooks; payment fields on project prepared for Sprint 2.

---

## Sprint 2 — Payments, Quotation & Invoice ✅ Completed

| Feature | Status |
|---------|--------|
| Payments module (hub, overview, client view) | ✅ |
| Payment ledger + balance sync | ✅ |
| ReceivePayment (Cash / UPI) — shared component | ✅ |
| Advance payment in inquiry wizard | ✅ |
| Quotation generation (QTN-0001) | ✅ |
| Invoice generation (INV-0001) | ✅ |
| Document template (shared, print-ready) | ✅ |
| Template Editor in Settings | ✅ |
| Client profile payments section | ✅ |
| Project → Payment Overview link | ✅ |
| Nav: Billing → Payments | ✅ |

**Architecture outcome:** Payment ledger as financial SSOT; documents as live pointers; profile/template feeds all generated documents.

**Pending from Sprint 2:**
- Migrate local entities to database (still localStorage)
- Remove or bridge legacy `/billing` API invoices
- GST calculation on documents

---

## Sprint 3 — Projects Workspace, Task Flow & Project Management ✅ Completed

| Feature | Status |
|---------|--------|
| Project List: Active/Completed tabs, Category column, expanded search | ✅ |
| Project Workspace header (number, name, client, category, status, progress, engineer, dates) | ✅ |
| Full tab set: Overview, Task Flow, Bookings, Payments, Files & Links, Project Expenses, Timeline (placeholder), Notes | ✅ |
| Mandatory tasks: Payment, Files Shared, Project Delivery (non-deletable, reorderable) | ✅ |
| Task management: add/edit/delete/duplicate/drag-and-drop reorder | ✅ |
| Full project completion rule (all tasks + full payment → `completed`, auto move to Completed tab) | ✅ |
| Payment task auto-synced from payment ledger (no duplicate financial state) | ✅ |
| Files & Links redesigned to cloud-storage-ready architecture (metadata + URL only) | ✅ |
| Project Expenses (internal-only) + owner-only profit calculation | ✅ |
| Notes tab | ✅ |
| Quick navigation shortcuts (Client, Bookings, Payments, Files) from Overview | ✅ |
| Bookings widget on Dashboard | ✅ Completed in Sprint 4 |
| Unified booking model (merge API + local tracks) | 🎯 Deferred to Sprint 5 |
| Engineer assignment workflow (structured, not free text) | 🎯 Deferred to Sprint 5 |
| Timeline tab (aggregate events) | 🎯 Deferred to Sprint 5 |
| Client approval step (optional inquiry status) | 🎯 Deferred |
| Role-based permissions (server-enforced, beyond UI gating) | 🎯 Deferred |

**Architecture outcome:** Project workspace confirmed as the single operating surface for a studio
engagement. Mandatory-task automation (`evaluateProjectCompletion()`) becomes the one rule engine
governing project status, eliminating any need for other modules to duplicate completion logic.
Expenses and cloud-file metadata are embedded on `StudioProject`, following the same
"no duplicate business data" principle as tasks, files, and links.

---

## Sprint 4 — Studios, Bookings & Calendar ✅ Completed

| Feature | Status |
|---------|--------|
| Rename Calendar module to Bookings (nav, routes, titles; `/calendar/*` → `/bookings/*`) | ✅ |
| Settings → Studios (unlimited rooms, name, description, color, active/inactive) | ✅ |
| Booking week view (7 days, horizontal scroll, prev/next week) | ✅ |
| Default slots (11 AM–2 PM, 3 PM–6 PM, 7 PM–9 PM) + custom slot creation | ✅ |
| Booking flow: project, client (auto), studio, booking for, notes, date, slot, status | ✅ |
| Project workspace Bookings tab (studio, date, time, status, notes → detail) | ✅ |
| Drag-and-drop reschedule (date + slot) | ✅ |
| Bookings dashboard widget (today + upcoming) | ✅ |
| Project Status widget — Booking Today indicator | ✅ |
| Double-booking validation ("Studio already booked.") | ✅ |
| Global search — bookings by project, client, studio, date | ✅ |

**Architecture outcome:** Bookings confirmed as the project-owned scheduling engine. Studio rooms and booking slots are owner-configurable in Settings. All booking data references `projectId`; `project.bookingIds[]` remains the project-side index.

**Deferred to Sprint 5+:** Timeline tab, unified API/local booking model, structured engineer roster, API session ↔ project linking.

---

## Sprint 5 — Timeline, Operations & Analytics 🎯 Planned

| Feature | Target |
|---------|--------|
| Timeline tab (aggregate tasks, bookings, payments, sessions into one feed) | 🎯 |
| Unified booking model (merge API + local tracks) | 🎯 |
| Structured engineer assignment (replace free-text with a roster) | 🎯 |
| Link API Sessions to Projects (`sessionIds[]`) | 🎯 |
| Engineer time tracking (actual duration on tasks) | 🎯 |
| Studio utilization view | 🎯 |
| Real cloud provider integration (OAuth picker instead of pasted URL) | 🎯 |
| Persist local workflow to PostgreSQL (including expenses, files, links) | 🎯 |
| Project completion confirmation dialog (replace silent auto-completion) | 🎯 |
| Studio-native reports from payment ledger (INR) | 🎯 |

---

## Sprint 6 — Reports & Analytics 🎯 Planned

| Feature | Target |
|---------|--------|
| Studio-native reports from payment ledger (INR) | 🎯 |
| Project profitability (revenue − expenses) | 🎯 |
| Client lifetime value | 🎯 |
| Engineer workload reports | 🎯 |
| Export quotation/invoice PDF batch | 🎯 |
| GST-ready tax lines on documents | 🎯 |
| Dashboard remains lightweight (no chart overload) | 🎯 |

---

# Development Rules

## Before writing new code

1. **Read this document** — understand which track (API vs local) your feature belongs to.
2. **Identify the owning module** — if it relates to money, it goes through `lib/payments/`. If it relates to work delivery, it goes on `StudioProject`.
3. **Check for existing components** — search `components/` and `lib/` before creating new files.

## Always reuse existing architecture

- New entity? Follow `types → storage → events → snapshots → hook` pattern.
- New page? `{Domain}PageClient.tsx` in `components/` + thin `app/.../page.tsx` wrapper.
- New cross-entity read? Add a view-model builder (like `lib/documents/view-model.ts`), not inline joins in components.

## Never break working modules

- Do not change `StudioProject` shape without updating `normalizeLegacyProject()` migration.
- Do not bypass `syncProjectBalance()` when recording payments.
- Do not snapshot quotation data into documents.

## Never introduce duplicate logic

- One quotation calculator: `calculateQuotation()` in `lib/inquiry/quotation.ts`
- One payment recorder: `addPayment()` in `lib/payments/storage.ts`
- One receive-payment UI: `ReceivePayment.tsx`

## Always explain architecture changes

When a PR changes module boundaries, data ownership, or storage keys:

1. Update **this file** in the same PR.
2. Note **Current** vs **Target** if the change is incremental.
3. Add migration notes for localStorage schema changes.

## Verification checklist (before merge)

```bash
pnpm --filter @st-manager/web typecheck
pnpm --filter @st-manager/web build
pnpm --filter @st-manager/api typecheck   # if API touched
```

Manual smoke: sign in → inquiry → quotation → convert → payment → invoice.

---

# Appendix: Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 15, React 19, App Router, Turbopack |
| API | NestJS 11, Passport JWT, Prisma 7 |
| Database | PostgreSQL (prod), SQLite (dev) |
| Forms | react-hook-form + Zod |
| UI | `@st-manager/ui`, Tailwind v4, lucide-react |
| Desktop | Tauri 2 (future offline) |
| Auth | JWT access + refresh; roles: owner, assistant, engineer |

## Dev credentials

```
owner@st-manager.local      / devpassword
assistant@st-manager.local  / devpassword
engineer@st-manager.local   / devpassword
```

Seeded via `packages/database/scripts/seed-dev-user.ts`.

## API proxy

Web dev server rewrites `/api/*` → `http://localhost:4000/*` (`apps/web/next.config.ts`).

---

# Appendix: Known architectural gaps (honest status)

| Gap | Impact | Planned resolution |
|-----|--------|-------------------|
| Two data tracks (API vs localStorage) | Data not shared between clients/invoices API and studio workflow | Sprint 4 database migration |
| Two “Studio” concepts (API Studio vs local StudioRoom) | Naming confusion | Rename / unify — deferred to Sprint 4 |
| Two “Booking” concepts (API datetime vs local slots) | Calendar redirect hides API calendar | Unified model — deferred to Sprint 4 |
| Two “Invoice” concepts (API USD vs local INV-) | Legacy `/billing` routes orphaned | Deprecate API billing post-migration |
| localStorage persistence | No multi-device sync, size limits | PostgreSQL + optional desktop sync |
| Role gating UI-only | Assistants could bypass via devtools (e.g. Profit card is hidden but not server-enforced) | Server enforcement — deferred to Sprint 4 |
| Auth rehydration flash | Header shows logged-out briefly after login | Fix tokenStore → useAuth sync |
| Cloud file links are pasted URLs, not verified via provider OAuth | A user could paste an unrelated/invalid link | Real provider picker integration — Sprint 4 |
| Project completion is silent/automatic | No confirmation step before a project leaves "Active" | Add confirmation dialog — Sprint 4 |

---

*This document is the permanent reference for ST Manager development. Keep it accurate.*
