/**
 * Dashboard view model: one file the extension (via the native host) and the
 * desktop app both read. Composition follows the stage model: one subject
 * (next step), then the orbit (what changed, what professors said, what the
 * agent can do).
 *
 * "Agent can do" is logistics on the student's own stuff only (calendar
 * suggestions the student approves in the app). Never a Canvas submission,
 * post, or message — see docs/handoff/canvas-focus-pivot-2026-09-11.md.
 */
import { collapseByGroup } from "./freshness/classify.mjs";
import { normalizeTitle } from "./freshness/actions.mjs";
import { buildDigest, recentChanges } from "./freshness/view.mjs";

export const DASHBOARD_VERSION = 1;
const DAY = 24 * 60 * 60 * 1000;

function t(value) {
  const n = Date.parse(value || "");
  return Number.isFinite(n) ? n : null;
}

function isOpen(item) {
  const s = String(item.submission_state || "");
  return item.actionable !== false && !["submitted", "graded", "pending_review", "suppressed"].includes(s) && item.suppress_reason == null;
}

function courseLabel(item) {
  return item.course_code || item.course_name || null;
}

/** Next meaningful action: soonest open item due in the next 7 days, else newest missing. */
export function pickNextStep(items, { now, skipCosts = {}, events = [] }) {
  const open = (items || []).filter((i) => i.object_type !== "calendar_event" && isOpen(i));
  const upcoming = open
    .filter((i) => {
      const due = t(i.effective_due_at);
      return due != null && due >= now && due <= now + 7 * DAY;
    })
    .sort((a, b) => t(a.effective_due_at) - t(b.effective_due_at));
  let pick = upcoming[0];
  let why = pick ? "due_soon" : null;
  if (!pick) {
    const missing = open
      .filter((i) => i.submission_state === "missing" || (t(i.effective_due_at) != null && t(i.effective_due_at) < now && t(i.effective_due_at) > now - 14 * DAY))
      .sort((a, b) => t(b.effective_due_at) - t(a.effective_due_at));
    pick = missing[0];
    why = pick ? "missing" : null;
  }
  if (!pick) return null;
  const moved = events.find(
    (e) => e.kind === "due_changed" && e.course_id === String(pick.course_id) && String(e.title || "").toLowerCase() === String(pick.title || "").toLowerCase()
  );
  return {
    title: pick.title,
    course: courseLabel(pick),
    course_id: String(pick.course_id),
    assignment_id: String(pick.canvas_id || ""),
    due_at: pick.effective_due_at,
    url: pick.html_url || null,
    points_possible: pick.points_possible ?? null,
    why,
    moved: moved ? { from: moved.detail?.from || null, to: moved.detail?.to || null, at: moved.detected_at } : null,
    skip_cost: skipCosts[`${pick.course_id}:${pick.canvas_id}`] || null,
  };
}

function blockBefore(dueIso, { minutes = 90, hoursBefore = 26 } = {}) {
  const due = t(dueIso);
  if (due == null) return null;
  const start = due - hoursBefore * 60 * 60 * 1000;
  return { start: new Date(start).toISOString(), end: new Date(start + minutes * 60 * 1000).toISOString() };
}

/** Logistics the agent can prepare; the student approves each one in the app. */
export function buildAgentCanDo({ items, events, now }) {
  const out = [];
  const seen = new Set();
  // One suggestion per assignment: a moved due date wins over a plain "due soon".
  const push = (entry, title) => {
    const key = normalizeTitle(title);
    if (seen.has(key) || out.length >= 3) return;
    seen.add(key);
    out.push(entry);
  };
  for (const e of events) {
    if (e.kind !== "due_changed" || !e.detail?.to) continue;
    if ((t(e.detail.to) ?? 0) <= now || t(e.detected_at) < now - 7 * DAY) continue;
    const slot = blockBefore(e.detail.to);
    if (!slot) continue;
    push({
      id: `block:${e.key}`,
      kind: "calendar_block",
      label: `Move your work block for ${e.title}`,
      why: "Due date moved",
      suggestion: { key: e.key, title: `Work on ${e.title}`, ...slot, why: `Due date moved to ${e.detail.to}` },
    }, e.title);
  }
  const soon = (items || [])
    .filter((i) => isOpen(i) && i.object_type !== "calendar_event" && (Number(i.points_possible) || 0) > 0)
    .filter((i) => {
      const due = t(i.effective_due_at);
      return due != null && due > now + 26 * 60 * 60 * 1000 && due <= now + 4 * DAY;
    })
    .sort((a, b) => t(a.effective_due_at) - t(b.effective_due_at));
  for (const i of soon) {
    const slot = blockBefore(i.effective_due_at);
    if (!slot) continue;
    push({
      id: `block:${i.course_id}:${i.canvas_id}`,
      kind: "calendar_block",
      label: `Block 90 min for ${i.title}`,
      why: "Due in the next few days",
      suggestion: { key: `${i.course_id}:${i.canvas_id}`, title: `Work on ${i.title}`, ...slot, why: `Due ${i.effective_due_at}` },
    }, i.title);
  }
  return out;
}

/**
 * @param {{ events: object[], workSurface: object|null, health: object|null, skipCosts: object, status: object, now?: number }} input
 */
export function buildDashboard({ events = [], workSurface = null, health = null, skipCosts = {}, status = {}, now = Date.now() }) {
  const items = workSurface?.items || [];
  const courseNames = {};
  for (const i of items) if (i.course_id && !courseNames[i.course_id]) courseNames[i.course_id] = i.course_code || i.course_name;
  const changes = recentChanges(events, { now, courseNames });
  const recent = collapseByGroup(events.filter((e) => (t(e.detected_at) ?? 0) >= now - 14 * DAY));
  return {
    version: DASHBOARD_VERSION,
    generated_at: new Date(now).toISOString(),
    status: {
      ...status,
      health_state: health?.state || workSurface?.health_state || null,
      as_of: health?.as_of || workSurface?.as_of || null,
    },
    next_step: pickNextStep(items, { now, skipCosts, events: recent }),
    changes,
    digest: buildDigest(events, { now, courseNames }),
    agent_can_do: buildAgentCanDo({ items, events: recent, now }),
  };
}
