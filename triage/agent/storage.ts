import { defineStorage, type StorageDefinition } from "@cursor/july/storage";
import { fileKv } from "@cursor/july/storage/file-kv";

/**
 * Durable storage for pending approvals and session restore.
 *
 * Local/dev uses file-backed KV under `.agent-serve/kv`. For Cursor-managed
 * hosting, swap to `cursorHostedStorage()` from `@cursor/july/storage/cursor-hosted`.
 */
const storage: StorageDefinition = defineStorage({
  name: "file-kv",
  policy: {
    debounceMs: 15_000,
    restore: { maxSessions: 200, maxAgeMs: 14 * 24 * 60 * 60_000 },
  },
  ...fileKv(),
});

export default storage;
