# @st-manager/api

NestJS backend for ST Manager. Source of truth for PostgreSQL, sync endpoints for the desktop app, AI orchestration entry point, and the pluggable authentication boundary.

- `src/common/` — cross-cutting concerns: guards, filters, interceptors, pipes
- `src/config/` — environment loading, validation, feature flags
- `src/modules/` — domain feature modules
- `test/` — integration and end-to-end tests

Status: scaffolding only, no application code yet.
