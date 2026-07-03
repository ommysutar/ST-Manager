# @st-manager/storage

Unified file/blob storage interface for uploads (client photos, session attachments, exports). Defines contracts and a local filesystem adapter; cloud/S3 implementations are deferred to consuming apps or future milestones.

## Exports

- `StorageAdapter` — `put`, `get`, `delete`
- `createLocalFilesystemAdapter({ basePath })` — Node filesystem implementation with key sanitization
- `StoredObject`, `PutOptions`, `StorageError`, `StorageNotFoundError`
- `RemoteStorageAdapterOptions` — interface stub only (not implemented in M9)

## Smoke test

```bash
pnpm --filter @st-manager/storage smoke
```

Writes test artifacts under `.data/smoke/` (gitignored) and exercises put/get/delete.

## Status

Implemented in M9 — local filesystem adapter + smoke script. Not yet wired into any API route or client feature.
