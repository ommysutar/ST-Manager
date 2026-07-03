# @st-manager/logging

Provider-agnostic logging contract shared by NestJS, Next.js, and Tauri so all apps emit logs with the same shape and levels. Apps wire their own transports; this package owns the interface and a reference console transport.

## Exports

- `createLogger(options)` — structured logger with level filtering
- `createConsoleTransport(options)` — JSON lines to stdout (default formatter: `formatJsonLogRecord`)
- `formatJsonLogRecord(record)` — single-line JSON serializer
- Types: `LogLevel`, `LogRecord`, `Logger`, `LogTransport`, `RemoteLogTransportOptions` (interface stub only)

## JSON log shape

```json
{"timestamp":"2026-07-03T08:00:00.000Z","level":"info","service":"st-manager-api","context":"Bootstrap","message":"ST Manager API listening on http://localhost:4000"}
```

## Usage (NestJS API)

`apps/api` registers `StManagerNestLoggerService` (implements Nest `LoggerService`) via `app.useLogger()` in `main.ts`. Existing `@nestjs/common` `Logger` call sites emit structured JSON through the shared transport.

## Status

Implemented in M9 — console/JSON transport and NestJS API wiring. Remote transport remains a type-only contract for future milestones.
