# @st-manager/logging

Provider-agnostic logging contract shared by NestJS, Next.js, and Tauri so all apps emit logs with the same shape and levels. Apps wire their own transports; this package owns the interface only.

- `src/transports/` — transport contracts (console, remote)
- `src/formatters/` — JSON and pretty-print formatter contracts

Status: scaffolding only, no application code yet.
