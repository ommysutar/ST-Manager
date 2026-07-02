# ST Manager

Enterprise AI-powered Studio Management System.

## Stack

- **Desktop:** Tauri 2, React, Vite, TypeScript
- **Web:** Next.js, React, TypeScript (Studio Web Portal, V1 scope)
- **API:** NestJS, TypeScript
- **Data:** Prisma, PostgreSQL, SQLite
- **UI:** Tailwind CSS, shadcn/ui

## Monorepo Structure

| Path | Description |
|------|-------------|
| `apps/api` | NestJS backend |
| `apps/web` | Next.js Studio Web Portal |
| `apps/desktop` | Tauri 2 desktop app |
| `packages/*` | Shared libraries |
| `docs/*` | Project documentation |
| `infra/*` | Infrastructure and environment templates |
| `tooling/*` | Repo-level scripts |

## Status

Architecture scaffolding only. Application code has not been implemented yet.

## Documentation

See the [`docs/`](./docs/) directory for product, architecture, and development guides.
