/**
 * Thin wrapper: week sync is the canonical generation + adapters.
 * DAYS still windows week.md; the raw snapshot stays full-term (CATALOG_DAYS).
 */
process.env.DAYS = process.env.DAYS || "14";
process.env.CATALOG_DAYS = process.env.CATALOG_DAYS || "150";
await import("./sync-canvas-canonical.mjs");
