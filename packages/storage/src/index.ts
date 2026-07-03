export type { StorageAdapter } from "./adapters/storage-adapter";
export { createLocalFilesystemAdapter } from "./adapters/local-filesystem";
export { StorageError, StorageNotFoundError } from "./types/errors";
export type { PutOptions, RemoteStorageAdapterOptions, StoredObject } from "./types/stored-object";
