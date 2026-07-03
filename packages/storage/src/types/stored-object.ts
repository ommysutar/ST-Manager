export interface StoredObject {
  key: string;
  size: number;
  mimeType?: string;
  createdAt: Date;
}

export interface PutOptions {
  mimeType?: string;
  overwrite?: boolean;
}

/** Future remote/S3 adapter contract — not implemented in M9. */
export interface RemoteStorageAdapterOptions {
  bucket: string;
  region?: string;
  endpoint?: string;
}
