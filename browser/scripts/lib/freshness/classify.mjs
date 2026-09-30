/**
 * Canvas change signals → student-facing change events.
 *
 * Input is what the extension sends after the activity-stream summary moves:
 * recent activity-stream items and a planner window. Output is a list of
 * events with stable dedupe keys, plus updated classifier state. Pure and
 * dependency-free so it also runs inside the extension (extension-only mode).
 *
 * Event shape (shared with feed and snapshot diff events):
 *   { key, kind, source, course_id, title, url, at, detected_at, group?, detail, actions? }
 */
import { extractActions, htmlToText, normalizeTitle, previewText } from "./actions.mjs";

export const EVENT_KINDS = [
  "announcement",
  "due_changed",
  "assignment_added",
  "graded",
  "comment",
  "instructions_edited",
  "points_changed",
  "page_updated",
];

/** How far back a first-ever look reaches (older history is baseline, not news). */
export const FIRST_LOOK_MS = 7 * 24 * 60 * 60 * 1000;
/** Never surface stream items older than this, even after baseline. */
export const MAX_STREAM_AGE_MS = 21 * 24 * 60 * 60 * 1000;

const DUE_CHANGED_RE = /^assignment due date (?:override )?changed\s*[:\-–]\s*/i;
const CREATED_RE = /^assignment created\s*[:\-–]\s*/i;

export function emptyClassifierState() {
  return { stream_baselined_at: null, planner_baselined_at: null, planner_due: {} };
}

function iso(value) {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function str(value) {
  return value == null ? null : String(value);
}

/** "HW 5, APPM 1235" → "HW 5" (Canvas appends the course code). */
function stripCourseSuffix(title) {
  const parts = String(title || "").split(/,\s*/);
  return parts.length > 1 ? parts.slice(0, -1).join(", ") : String(title || "");
}

function streamEvent(item, detectedAt) {
  const at = iso(item.updated_at || item.created_at);
  const base = {
    source: "activity_stream",
    course_id: str(item.course_id),
    url: item.html_url || null,
    at,
    detected_at: detectedAt,
  };
  if (item.type === "Announcement") {
    const text = htmlToText(item.message);
    return {
      ...base,
      key: `announcement:${item.announcement_id || item.id}`,
      kind: "announcement",
      title: item.title || "Announcement",
      at: iso(item.created_at) || at,
      detail: { preview: previewText(text) },
      actions: extractActions(text),
    };
  }
  if (item.type === "Message" && /due date/i.test(item.notification_category || "")) {
    const rawTitle = String(item.title || "");
    const text = htmlToText(item.message);
    if (DUE_CHANGED_RE.test(rawTitle)) {
      const title = stripCourseSuffix(rawTitle.replace(DUE_CHANGED_RE, ""));
      return {
        ...base,
        key: `message:${item.id}`,
        kind: "due_changed",
        title,
        group: `due:${normalizeTitle(title)}`,
        detail: { preview: previewText(text, 200) },
      };
    }
    if (CREATED_RE.test(rawTitle)) {
      const title = stripCourseSuffix(rawTitle.replace(CREATED_RE, ""));
      return {
        ...base,
        key: `message:${item.id}`,
        kind: "assignment_added",
        title,
        group: `added:${normalizeTitle(title)}`,
        detail: { preview: previewText(text, 200) },
      };
    }
    return null;
  }
  if (item.type === "Submission") {
    const assignment = item.assignment || {};
    const title = assignment.name || stripCourseSuffix(item.title) || "Assignment";
    const comments = Array.isArray(item.submission_comments) ? item.submission_comments : [];
    const graded = item.workflow_state === "graded" && (item.score != null || item.grade != null);
    if (graded) {
      return {
        ...base,
        key: `graded:${item.assignment_id || assignment.id || item.id}:${item.graded_at || item.updated_at || ""}`,
        kind: "graded",
        title,
        at: iso(item.graded_at) || at,
        detail: {
          score: item.score ?? null,
          grade: item.grade ?? null,
          points_possible: assignment.points_possible ?? null,
        },
      };
    }
    if (comments.length) {
      const last = comments[comments.length - 1] || {};
      return {
        ...base,
        key: `comment:${item.assignment_id || assignment.id || item.id}:${last.id || comments.length}`,
        kind: "comment",
        title,
        at: iso(last.created_at) || at,
        detail: { preview: previewText(last.comment || "", 200) },
      };
    }
  }
  return null;
}

/**
 * @param {object[]} items activity-stream items
 * @param {object} state classifier state (mutated copy returned)
 * @param {{ now?: number }} [opts]
 */
export function eventsFromStream(items, state, { now = Date.now() } = {}) {
  const next = { ...emptyClassifierState(), ...state };
  const detectedAt = new Date(now).toISOString();
  const firstLook = !next.stream_baselined_at;
  const floor = now - (firstLook ? FIRST_LOOK_MS : MAX_STREAM_AGE_MS);
  const events = [];
  for (const item of Array.isArray(items) ? items : []) {
    const event = streamEvent(item || {}, detectedAt);
    if (!event) continue;
    const t = Date.parse(event.at || "");
    if (Number.isFinite(t) && t < floor) continue;
    events.push(event);
  }
  next.stream_baselined_at = next.stream_baselined_at || detectedAt;
  return { events, state: next };
}

function plannerKey(p) {
  return `${p.course_id || p.plannable?.course_id || ""}:${p.plannable_type}:${p.plannable_id}`;
}

/**
 * Planner window → added items and moved due dates. The first look only
 * records a baseline; changes are reported from the second look on.
 */
export function eventsFromPlanner(items, state, { now = Date.now() } = {}) {
  const next = { ...emptyClassifierState(), ...state, planner_due: { ...(state?.planner_due || {}) } };
  const detectedAt = new Date(now).toISOString();
  const baselined = Boolean(next.planner_baselined_at);
  const events = [];
  for (const p of Array.isArray(items) ? items : []) {
    if (!p || !["assignment", "quiz", "discussion_topic"].includes(p.plannable_type)) continue;
    const key = plannerKey(p);
    const due = iso(p.plannable?.due_at || p.plannable_date);
    const title = p.plannable?.title || "Assignment";
    const base = {
      source: "planner",
      course_id: str(p.course_id),
      title,
      url: p.html_url || null,
      detected_at: detectedAt,
    };
    if (baselined && !(key in next.planner_due)) {
      events.push({
        ...base,
        key: `planner-added:${key}`,
        kind: "assignment_added",
        at: iso(p.plannable?.created_at) || detectedAt,
        group: `added:${normalizeTitle(title)}`,
        detail: { due_at: due, course_name: p.context_name || null },
      });
    } else if (baselined && next.planner_due[key] !== due && (next.planner_due[key] || due)) {
      events.push({
        ...base,
        key: `planner-due:${key}:${due || "none"}`,
        kind: "due_changed",
        at: detectedAt,
        group: `due:${normalizeTitle(title)}`,
        detail: { from: next.planner_due[key] || null, to: due, course_name: p.context_name || null },
      });
    }
    next.planner_due[key] = due;
  }
  next.planner_baselined_at = next.planner_baselined_at || detectedAt;
  return { events, state: next };
}

/** One extension delta → events + state. */
export function classifyDelta(delta, state, { now = Date.now() } = {}) {
  const fromStream = eventsFromStream(delta?.stream || [], state, { now });
  const fromPlanner = eventsFromPlanner(delta?.planner || [], fromStream.state, { now });
  return { events: [...fromStream.events, ...fromPlanner.events], state: fromPlanner.state };
}

/** Stable summary signature: changes whenever any count or unread count moves. */
export function summarySignature(summary) {
  if (!Array.isArray(summary)) return null;
  return summary
    .map((row) => `${row.type}:${row.notification_category || ""}:${row.count}:${row.unread_count}`)
    .sort()
    .join("|");
}

/**
 * Collapse duplicate notices of the same change (e.g. the activity-stream
 * "Due Date Changed" message and the planner diff) within a window.
 */
export function collapseByGroup(events, { windowMs = 48 * 60 * 60 * 1000 } = {}) {
  const sorted = [...events].sort((a, b) => Date.parse(b.detected_at || b.at || 0) - Date.parse(a.detected_at || a.at || 0));
  const lastSeen = new Map();
  const out = [];
  for (const event of sorted) {
    if (!event.group) {
      out.push({ ...event });
      continue;
    }
    const t = Date.parse(event.detected_at || event.at || 0);
    const prev = lastSeen.get(event.group);
    if (prev != null && Math.abs(prev.t - t) <= windowMs) {
      // Keep the newest notice, but take any detail it lacks (the planner diff
      // knows from/to; the stream message does not).
      for (const [k, v] of Object.entries(event.detail || {})) {
        if (prev.event.detail[k] == null && v != null) prev.event.detail[k] = v;
      }
      prev.event.url = prev.event.url || event.url;
      prev.event.course_id = prev.event.course_id || event.course_id;
      continue;
    }
    const copy = { ...event, detail: { ...(event.detail || {}) } };
    lastSeen.set(event.group, { t, event: copy });
    out.push(copy);
  }
  return out;
}
