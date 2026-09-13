import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  acquireAuthLock,
  authLockPath,
  isProcessAlive,
} from "../scripts/lib/canvas-session.mjs";

describe("auth advisory lock", () => {
  it("isProcessAlive reports this process as alive", () => {
    assert.equal(isProcessAlive(process.pid), true);
    assert.equal(isProcessAlive(-1), false);
    assert.equal(isProcessAlive(NaN), false);
  });

  it("acquireAuthLock creates and releases the lock file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-lock-"));
    const lockPath = authLockPath(dir);
    const release = await acquireAuthLock(dir, { timeoutMs: 2_000, pollMs: 50 });
    assert.ok(fs.existsSync(lockPath));
    assert.match(fs.readFileSync(lockPath, "utf8"), new RegExp(`^${process.pid}\\b`));
    release();
    assert.equal(fs.existsSync(lockPath), false);
    release(); // idempotent
  });

  it("steals a lock left by a dead pid", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-lock-"));
    const lockPath = authLockPath(dir);
    fs.writeFileSync(lockPath, "999999999\n");
    assert.equal(isProcessAlive(999999999), false);
    const release = await acquireAuthLock(dir, { timeoutMs: 2_000, pollMs: 50 });
    assert.match(fs.readFileSync(lockPath, "utf8"), new RegExp(`^${process.pid}\\b`));
    release();
  });

  it("times out with a clear message when another live holder owns the lock", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-lock-"));
    const first = await acquireAuthLock(dir, { timeoutMs: 2_000, pollMs: 50 });
    await assert.rejects(
      () => acquireAuthLock(dir, { timeoutMs: 300, pollMs: 50 }),
      (err) => {
        assert.match(String(err.message), /another Canvas browser script/);
        assert.match(String(err.message), /AUTH_DIR/);
        return true;
      }
    );
    first();
  });
});
