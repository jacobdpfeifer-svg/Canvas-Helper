/**
 * Per-user data directory — mirrors Python ``canvas_mcp.core.user_root``
 * and Tauri ``app/src-tauri/src/inbox.rs``.
 *
 * Priority:
 *   1. ``DEV_USER_ROOT`` (absolute override)
 *   2. OS app-support / ProductName / {PRODUCT_USER_ID || "dev"}
 *
 * Never falls back to ``{repo}/inbox`` — that silent split broke the
 * SSO → API → inbox truth path.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const PRODUCT_NAME = process.env.PRODUCT_NAME?.trim() || "ProductName";

export function resolveProductUserId() {
  const fromEnv = process.env.PRODUCT_USER_ID?.trim();
  return fromEnv || "dev";
}

/** OS-standard application support directory for the product (no user id). */
export function defaultAppSupportRoot(product = PRODUCT_NAME) {
  const home = os.homedir();
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", product);
  }
  if (process.platform === "win32") {
    const appdata = process.env.APPDATA;
    if (appdata) return path.join(appdata, product);
    return path.join(home, "AppData", "Roaming", product);
  }
  const xdg = process.env.XDG_DATA_HOME;
  if (xdg) return path.join(xdg, product);
  return path.join(home, ".local", "share", product);
}

/**
 * Resolve the per-user data directory (same rules as Python resolve_user_root).
 * @param {{ create?: boolean, announce?: boolean }} [opts]
 */
export function resolveUserRoot(opts = {}) {
  const { create = false, announce = false } = opts;
  const override = process.env.DEV_USER_ROOT?.trim();
  let root;
  let via;
  if (override) {
    root = path.resolve(override);
    via = "DEV_USER_ROOT";
  } else {
    const userId = resolveProductUserId();
    root = path.join(defaultAppSupportRoot(), userId);
    via = `app-support/${userId}`;
  }

  if (create) {
    fs.mkdirSync(path.join(root, "inbox", "courses"), { recursive: true });
    fs.mkdirSync(path.join(root, "calibration"), { recursive: true });
  }

  if (announce) {
    console.error(`[user-root] ${root} (via ${via})`);
  }
  return root;
}

export function resolveInboxDir(opts = {}) {
  return path.join(resolveUserRoot(opts), "inbox");
}
