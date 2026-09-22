/**
 * Thin wrapper: week sync is the canonical generation + adapters.
 * WEEK_TABLE_DAYS windows week.md; the raw snapshot stays full-term (CATALOG_DAYS).
 */
process.env.WEEK_TABLE_DAYS = process.env.WEEK_TABLE_DAYS || "30";
process.env.CATALOG_DAYS = process.env.CATALOG_DAYS || "150";
await import("./sync-canvas-canonical.mjs");
