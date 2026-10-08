import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { acquireSyncLock } from "../scripts/lib/sync-lock.mjs";

test("sync lock rejects concurrent runs and releases cleanly", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kairos-lock-"));
  const release = acquireSyncLock(root);
  assert.throws(() => acquireSyncLock(root), (error) => error.code === "sync_in_progress");
  release();
  const releaseAgain = acquireSyncLock(root);
  releaseAgain();
});
