# @st-manager/desktop

Tauri 2 native desktop client (React + Vite frontend, Rust shell). Offline-capable via embedded SQLite with background sync to PostgreSQL through `@st-manager/api`.

- `src/` — React frontend rendered in the Tauri webview
- `src/components/`, `src/hooks/`, `src/lib/`, `src/styles/` — desktop-specific UI layer
- `src-tauri/src/` — Rust application shell
- `src-tauri/capabilities/` — Tauri 2 capability/security configuration
- `src-tauri/icons/` — application icons

Status: scaffolding only, no application code yet.
