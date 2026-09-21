/**
 * Canvas reliability contract: identity, evidence metadata, health enums.
 * Pure — no network, no filesystem.
 */
import crypto from "node:crypto";

export const SCHEMA_VERSION = 1;

export const OBJECT_TYPES = [
  "course",
  "assignment",
  "assignment_group",
  "submission",
  "module",
  "module_item",
  "calendar_event",
  "planner_item",
  "discussion",
  "quiz",
  "course_term",
  "sync_run",
];

export const DATE_SOURCE_KINDS = ["base", "student_override", "section_override", "unknown"];

export const AUTHORITY = ["authoritative", "inferred", "unknown"];

export const HEALTH_STATES = [
  "fresh_complete",
  "fresh_partial",
  "stale_complete",
  "stale_partial",
  "empty_unverified",
  "blocked",
];

export const SUBMISSION_STATES = [
  "submitted",
  "graded",
  "pending_review",
  "late",
  "missing",
  "unsubmitted",
  "suppressed",
  "unknown",
];

export const GRADE_SCENARIOS = ["canvas_reported", "graded_only", "risk_adjusted", "what_if"];

export const GRADE_STATUSES = ["ok", "partial", "cannot_calculate"];

export const SOFT_STALE_MS = 24 * 60 * 60 * 1000;
export const HARD_STALE_MS = 72 * 60 * 60 * 1000;

export function hashFields(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

export function identityKey({ tenant_id, course_id, object_type, canvas_id }) {
  return `${tenant_id}|${course_id}|${object_type}|${canvas_id}`;
}

export function parseIdentityKey(key) {
  const [tenant_id, course_id, object_type, canvas_id] = String(key).split("|");
  return { tenant_id, course_id, object_type, canvas_id };
}

/** Never invent a Canvas ID from a title. */
export function requireCanvasId(row, { object_type } = {}) {
  const id = row?.id ?? row?.canvas_id ?? row?.assignment_id ?? row?.plannable_id;
  if (id == null || id === "") {
    return { ok: false, unkeyed: { object_type: object_type || "unknown", title: row?.title || row?.name || null } };
  }
  return { ok: true, canvas_id: String(id) };
}

export function evidenceMeta({
  tenant_id,
  course_id,
  object_type,
  canvas_id,
  source_endpoint,
  fetched_at,
  updated_at,
  raw,
  timezone,
  published,
  actionable,
  suppress_reason,
  authority = "authoritative",
}) {
  return {
    tenant_id: String(tenant_id),
    course_id: course_id == null ? null : String(course_id),
    object_type,
    canvas_id: canvas_id == null ? null : String(canvas_id),
    source_endpoint,
    fetched_at,
    updated_at: updated_at || null,
    raw_hash: hashFields(raw ?? null),
    timezone: timezone || "UTC",
    published: published !== false,
    actionable: Boolean(actionable),
    suppress_reason: suppress_reason || null,
    authority,
  };
}

/**
 * Student-effective due date. Override dates beat base. Never treat lock_at as due.
 */
export function effectiveDateFromAssignment(assignment, { timezone } = {}) {
  const dates = Array.isArray(assignment?.all_dates) ? assignment.all_dates : [];
  const records = [];
  for (const d of dates) {
    if (!d) continue;
    const kind = d.base === false
      ? d.set_type === "CourseSection" || d.title
        ? "section_override"
        : "student_override"
      : "base";
    records.push({
      source_kind: DATE_SOURCE_KINDS.includes(kind) ? kind : "unknown",
      due_at: d.due_at || null,
      lock_at: d.lock_at || null,
      unlock_at: d.unlock_at || null,
      override_id: d.id != null ? String(d.id) : null,
      base: d.base !== false,
      context: d.title || d.set_type || null,
    });
  }
  if (!records.length && assignment?.due_at) {
    records.push({
      source_kind: "base",
      due_at: assignment.due_at,
      lock_at: assignment.lock_at || null,
      unlock_at: assignment.unlock_at || null,
      override_id: null,
      base: true,
      context: null,
    });
  }
  const override = records.find((r) => r.source_kind !== "base" && r.due_at);
  const base = records.find((r) => r.source_kind === "base" && r.due_at) || records.find((r) => r.due_at);
  return {
    effective_due_at: override?.due_at || base?.due_at || assignment?.due_at || null,
    timezone: timezone || "UTC",
    dates: records,
  };
}

export function emptyHealth({ as_of, timezone = "UTC", state = "empty_unverified" } = {}) {
  return {
    state,
    as_of: as_of || null,
    timezone,
    last_complete_sync_id: null,
    last_complete_at: null,
    stale_after_ms: SOFT_STALE_MS,
    hard_stale_after_ms: HARD_STALE_MS,
    coverage: {},
    truncated: [],
    failed_endpoints: [],
    duplicate_conflicts: [],
    named_courses_failed: [],
    inspect_in_canvas: true,
  };
}

export function classifyFreshness({
  complete,
  failed_endpoints = [],
  named_courses_failed = [],
  truncated = [],
  finished_at,
  now = Date.now(),
  soft_ms = SOFT_STALE_MS,
  hard_ms = HARD_STALE_MS,
} = {}) {
  const hasPartial = Boolean(failed_endpoints.length || named_courses_failed.length || truncated.length);
  if (!finished_at && !complete) return "empty_unverified";
  const age = finished_at ? now - Date.parse(finished_at) : 0;
  const stale = Number.isFinite(age) && age > soft_ms;
  const veryStale = Number.isFinite(age) && age > hard_ms;
  if (complete && !hasPartial) {
    if (veryStale || stale) return "stale_complete";
    return "fresh_complete";
  }
  if (stale || veryStale) return "stale_partial";
  return "fresh_partial";
}

export function validateIdentityRow(row, seen) {
  const errors = [];
  if (!row?.tenant_id) errors.push("missing tenant_id");
  if (!row?.object_type) errors.push("missing object_type");
  if (!row?.canvas_id) errors.push("missing canvas_id");
  if (row?.course_id && row.object_type !== "course") {
    /* ok */
  }
  if (row?.canvas_id && String(row.canvas_id).includes("|")) {
    errors.push("canvas_id must not contain identity separators");
  }
  const key = identityKey(row);
  if (seen.has(key)) errors.push(`identity collision ${key}`);
  else seen.add(key);
  if (row?.updated_at && Number.isNaN(Date.parse(row.updated_at))) {
    errors.push(`invalid updated_at for ${key}`);
  }
  if (row?.fetched_at && Number.isNaN(Date.parse(row.fetched_at))) {
    errors.push(`invalid fetched_at for ${key}`);
  }
  return errors;
}

export function validateGeneration(generation) {
  const errors = [];
  const unkeyed_sources = [];
  const seen = new Set();
  const manifest = generation?.manifest;
  if (!manifest) errors.push("missing manifest");
  else {
    for (const field of ["schema_version", "sync_id", "tenant_id", "profile_id_hash", "started_at"]) {
      if (manifest[field] == null || manifest[field] === "") errors.push(`manifest missing ${field}`);
    }
    if (manifest.schema_version !== SCHEMA_VERSION) {
      errors.push(`schema_version ${manifest.schema_version} != ${SCHEMA_VERSION}`);
    }
    if (typeof manifest.complete !== "boolean") errors.push("manifest.complete must be boolean");
  }
  const tenant = manifest?.tenant_id;
  for (const course of generation?.courses || []) {
    const id = course?.course?.id;
    if (id == null) {
      errors.push("course without id");
      continue;
    }
    if (course.course.tenant_id && tenant && course.course.tenant_id !== tenant) {
      errors.push(`cross-tenant course ${id}`);
    }
    for (const a of course.assignments || []) {
      const got = requireCanvasId(a, { object_type: "assignment" });
      if (!got.ok) {
        unkeyed_sources.push({ ...got.unkeyed, course_id: String(id) });
        continue;
      }
      if (a.course_id != null && String(a.course_id) !== String(id)) {
        errors.push(`cross-course assignment ${got.canvas_id} in course ${id}`);
      }
      errors.push(
        ...validateIdentityRow(
          {
            tenant_id: tenant,
            course_id: String(id),
            object_type: "assignment",
            canvas_id: got.canvas_id,
            fetched_at: a.fetched_at || manifest?.finished_at,
            updated_at: a.updated_at,
          },
          seen
        )
      );
    }
  }
  const truncated = [];
  for (const ep of manifest?.pagination || []) {
    if (ep.truncated) truncated.push(ep.endpoint);
  }
  return { ok: errors.length === 0, errors, unkeyed_sources, truncated };
}

export function sanitizeForLog(text) {
  const s = String(text || "");
  if (!s) return "";
  return `[redacted ${s.length} chars]`;
}

export function isHttpUrl(url) {
  try {
    const u = new URL(String(url || ""));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function hashProfileId(profileId) {
  return hashFields(String(profileId || "dev"));
}
