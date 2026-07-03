import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageAdapter } from "./storage-adapter";
import { StorageError, StorageNotFoundError } from "../types/errors";
import type { PutOptions, StoredObject } from "../types/stored-object";

export interface LocalFilesystemAdapterOptions {
  basePath: string;
}

function assertSafeKey(key: string): void {
  if (!key || key.startsWith("/") || key.includes("\\") || key.includes("..")) {
    throw new StorageError(`Invalid storage key: ${key}`);
  }
}

export function createLocalFilesystemAdapter(
  options: LocalFilesystemAdapterOptions,
): StorageAdapter {
  const basePath = path.resolve(options.basePath);

  const resolveKeyPath = (key: string): string => {
    assertSafeKey(key);
    const resolved = path.resolve(basePath, key);
    if (!resolved.startsWith(`${basePath}${path.sep}`) && resolved !== basePath) {
      throw new StorageError(`Invalid storage key: ${key}`);
    }
    return resolved;
  };

  return {
    async put(key: string, data: Buffer, putOptions?: PutOptions): Promise<StoredObject> {
      const filePath = resolveKeyPath(key);

      if (!putOptions?.overwrite) {
        try {
          await readFile(filePath);
          throw new StorageError(`Storage object already exists: ${key}`);
        } catch (error) {
          if (error instanceof StorageError) {
            throw error;
          }
          if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
            throw error;
          }
        }
      }

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, data);

      return {
        key,
        size: data.byteLength,
        mimeType: putOptions?.mimeType,
        createdAt: new Date(),
      };
    },

    async get(key: string): Promise<Buffer> {
      const filePath = resolveKeyPath(key);

      try {
        return await readFile(filePath);
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          throw new StorageNotFoundError(key);
        }
        throw error;
      }
    },

    async delete(key: string): Promise<void> {
      const filePath = resolveKeyPath(key);

      try {
        await unlink(filePath);
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          throw new StorageNotFoundError(key);
        }
        throw error;
      }
    },
  };
}
