/**
 * "What changed" rows and the announcement digest. Shared by the local
 * brain's dashboard and the extension's extension-only fallback, so both
 * surfaces say the same thing about the same events.
 */
import { collapseByGroup } from "./classify.mjs";

const DAY = 24 * 60 * 60 * 1000;

export const KIND_LABEL = {
  announcement: "Announcement",
  due_changed: "Due date moved",
  assignment_added: "New assignment",
  graded: "Graded",
  comment: "New comment",
  instructions_edited: "Instructions changed",
  points_changed: "Points changed",
  page_updated: "Page updated",
};

function t(value) {
  const n = Date.parse(value || "");
  return Number.isFinite(n) ? n : null;
}

export function changeRow(e, courseNames = {}) {
  return {
    key: e.key,
    kind: e.kind,
    label: KIND_LABEL[e.kind] || e.kind,
    title: e.title,
    course: e.course_name || courseNames[e.course_id] || null,
    course_id: e.course_id || null,
    at: e.at || e.detected_at,
    detected_at: e.detected_at,
    url: e.url || null,
    detail: e.detail || {},
  };
}

/** Newest-first change rows from the last 14 days, duplicate notices collapsed. */
export function recentChanges(events, { now = Date.now(), courseNames = {}, limit = 12 } = {}) {
  const recent = collapseByGroup(events.filter((e) => KIND_LABEL[e.kind] && (t(e.detected_at) ?? 0) >= now - 14 * DAY));
  return recent
    .sort((a, b) => (t(b.detected_at) ?? 0) - (t(a.detected_at) ?? 0) || (t(b.at) ?? 0) - (t(a.at) ?? 0))
    .slice(0, limit)
    .map((e) => changeRow(e, courseNames));
}

/** Announcements from the last 7 days that carry at least one action. */
export function buildDigest(events, { now = Date.now(), courseNames = {} } = {}) {
  const recent = events.filter((e) => e.kind === "announcement" && (t(e.at) ?? t(e.detected_at) ?? 0) >= now - 7 * DAY);
  const withActions = recent.filter((e) => (e.actions || []).length);
  return {
    announcements_7d: recent.length,
    with_actions: withActions.length,
    items: withActions
      .sort((a, b) => (t(b.at) ?? 0) - (t(a.at) ?? 0))
      .slice(0, 8)
      .map((e) => ({
        key: e.key,
        title: e.title,
        course: e.course_name || courseNames[e.course_id] || null,
        course_id: e.course_id || null,
        at: e.at,
        url: e.url || null,
        actions: e.actions,
      })),
  };
}
