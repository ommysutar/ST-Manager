import type { PutOptions, StoredObject } from "../types/stored-object";

export interface StorageAdapter {
  put(key: string, data: Buffer, options?: PutOptions): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
