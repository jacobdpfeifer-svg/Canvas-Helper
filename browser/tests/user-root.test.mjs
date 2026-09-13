/**
 * Parity: Node user-root resolver matches Python / Tauri defaults.
 */
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  defaultAppSupportRoot,
  PRODUCT_NAME,
  resolveInboxDir,
  resolveProductUserId,
  resolveUserRoot,
} from "../scripts/lib/user-root.mjs";

describe("user-root resolver", () => {
  it("honors DEV_USER_ROOT for inbox", () => {
    const prev = process.env.DEV_USER_ROOT;
    process.env.DEV_USER_ROOT = "/tmp/productname-parity-test";
    try {
      assert.equal(
        resolveUserRoot(),
        path.resolve("/tmp/productname-parity-test")
      );
      assert.equal(
        resolveInboxDir(),
        path.join(path.resolve("/tmp/productname-parity-test"), "inbox")
      );
    } finally {
      if (prev === undefined) delete process.env.DEV_USER_ROOT;
      else process.env.DEV_USER_ROOT = prev;
    }
  });

  it("defaults to OS app-support / ProductName / dev (matches Python + Tauri)", () => {
    const prevRoot = process.env.DEV_USER_ROOT;
    const prevUser = process.env.PRODUCT_USER_ID;
    delete process.env.DEV_USER_ROOT;
    delete process.env.PRODUCT_USER_ID;
    try {
      assert.equal(resolveProductUserId(), "dev");
      assert.equal(PRODUCT_NAME, "ProductName");
      const expected = path.join(defaultAppSupportRoot(), "dev");
      assert.equal(resolveUserRoot(), expected);
      if (process.platform === "darwin") {
        assert.equal(
          expected,
          path.join(os.homedir(), "Library", "Application Support", "ProductName", "dev")
        );
      }
    } finally {
      if (prevRoot === undefined) delete process.env.DEV_USER_ROOT;
      else process.env.DEV_USER_ROOT = prevRoot;
      if (prevUser === undefined) delete process.env.PRODUCT_USER_ID;
      else process.env.PRODUCT_USER_ID = prevUser;
    }
  });

  it("never resolves to a path under the browser package alone", () => {
    const prev = process.env.DEV_USER_ROOT;
    delete process.env.DEV_USER_ROOT;
    try {
      const root = resolveUserRoot();
      assert.ok(!root.includes(`${path.sep}browser${path.sep}`));
      assert.ok(!root.endsWith(`${path.sep}browser`));
    } finally {
      if (prev === undefined) delete process.env.DEV_USER_ROOT;
      else process.env.DEV_USER_ROOT = prev;
    }
  });
});
