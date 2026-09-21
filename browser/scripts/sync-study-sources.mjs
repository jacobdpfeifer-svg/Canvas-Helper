/**
 * Study-source adapter. Never starts a second Canvas fetch when a canonical
 * generation already exists.
 */
import { resolveUserRoot } from "./lib/user-root.mjs";
import { readCurrentRaw } from "./lib/canvas-store.mjs";

const userRoot = resolveUserRoot({ create: true, announce: false });
if (readCurrentRaw(userRoot)) {
  process.env.CANVAS_ADAPTERS_ONLY = "1";
}
await import("./sync-canvas-canonical.mjs");
