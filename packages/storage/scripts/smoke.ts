import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createLocalFilesystemAdapter, StorageNotFoundError } from "../src/index";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const basePath = resolve(packageRoot, ".data/smoke");

async function main(): Promise<void> {
  const adapter = createLocalFilesystemAdapter({ basePath });
  const key = "m9-smoke-test.txt";
  const payload = Buffer.from("M9 storage smoke");

  const stored = await adapter.put(key, payload, { overwrite: true });
  if (stored.key !== key || stored.size !== payload.byteLength) {
    throw new Error("put() returned unexpected StoredObject metadata");
  }

  const retrieved = await adapter.get(key);
  if (!retrieved.equals(payload)) {
    throw new Error("get() content does not match put() payload");
  }

  await adapter.delete(key);

  try {
    await adapter.get(key);
    throw new Error("get() after delete should throw StorageNotFoundError");
  } catch (error) {
    if (!(error instanceof StorageNotFoundError)) {
      throw error;
    }
  }

  try {
    await adapter.put("../escape.txt", Buffer.from("bad"));
    throw new Error("put() with traversal key should throw");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Invalid storage key")) {
      throw error;
    }
  }

  process.stdout.write("M9 storage smoke: put/get/delete cycle passed\n");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
