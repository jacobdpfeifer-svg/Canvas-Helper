/**
 * Sync health projection — six states, tenant timezone, never hard-coded in React.
 */
import { classifyFreshness, emptyHealth, SOFT_STALE_MS, HARD_STALE_MS, SCHEMA_VERSION } from "./canvas-model.mjs";

export function summarize_sync_health({
  generation,
  now = Date.now(),
  blocked = false,
  blocked_reason = null,
} = {}) {
  if (blocked) {
    return {
      ...emptyHealth({ state: "blocked", as_of: new Date(now).toISOString(), timezone: generation?.timezone || "UTC" }),
      blocked_reason,
      schema_version: SCHEMA_VERSION,
      sync_id: generation?.manifest?.sync_id || null,
      surfaces_enabled: false,
    };
  }
  const manifest = generation?.manifest;
  if (!manifest) {
    return {
      ...emptyHealth({ as_of: new Date(now).toISOString() }),
      schema_version: SCHEMA_VERSION,
      sync_id: null,
      surfaces_enabled: false,
    };
  }
  const failed = manifest.failed_endpoints || [];
  const named = manifest.named_courses_failed || [];
  const legacyPlanner = (manifest.advisory_pagination ? [] : manifest.pagination || [])
    .filter((p) => p.truncated && p.endpoint === "planner");
  const requiredPagination = (manifest.pagination || []).filter(
    (p) => !legacyPlanner.includes(p)
  );
  const truncated = requiredPagination.filter((p) => p.truncated).map((p) => p.endpoint);
  const advisory_truncated = [...legacyPlanner, ...(manifest.advisory_pagination || [])]
    .filter((p) => p.truncated)
    .map((p) => p.endpoint);
  const state = classifyFreshness({
    complete: Boolean(manifest.complete),
    failed_endpoints: failed,
    named_courses_failed: named,
    truncated,
    advisory_truncated,
    finished_at: manifest.finished_at,
    now,
    soft_ms: SOFT_STALE_MS,
    hard_ms: HARD_STALE_MS,
  });
  const emptyUnverified = state === "empty_unverified";
  return {
    schema_version: SCHEMA_VERSION,
    sync_id: manifest.sync_id,
    state,
    as_of: manifest.finished_at,
    timezone: manifest.timezone || generation.timezone || "UTC",
    last_complete_sync_id: manifest.complete ? manifest.sync_id : manifest.last_complete_sync_id || null,
    last_complete_at: manifest.complete ? manifest.finished_at : manifest.last_complete_at || null,
    stale_after_ms: SOFT_STALE_MS,
    hard_stale_after_ms: HARD_STALE_MS,
    complete: Boolean(manifest.complete),
    usable_partial: Boolean(manifest.usable_partial),
    coverage: {
      requested: manifest.requested_endpoints || [],
      completed: manifest.completed_endpoints || [],
    },
    truncated,
    advisory_truncated,
    failed_endpoints: failed,
    unavailable_endpoints: manifest.unavailable_endpoints || [],
    named_courses_failed: named,
    duplicate_conflicts: generation.duplicate_conflicts || [],
    inspect_in_canvas: true,
    calendar_window: manifest.calendar_window || null,
    surfaces_enabled: !emptyUnverified && state !== "blocked",
    empty_means: emptyUnverified ? "no_successful_generation" : "no_matching_work",
  };
}

export { SOFT_STALE_MS, HARD_STALE_MS };
