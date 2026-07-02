# @st-manager/storage

Unified file/blob storage interface for uploads (client photos, session attachments, exports). Defines contracts only; cloud/local SDK implementations live in the consuming apps.

- `src/adapters/` — adapter contracts (local filesystem, S3-compatible/remote)
- `src/types/` — storage-related types (StoredObject, UploadOptions, MimeType)

Status: scaffolding only, no application code yet.
