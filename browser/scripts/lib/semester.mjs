/**
 * Pure semester-line helpers (no network, no Playwright): classify Canvas
 * graded items, compute each item's share of the course grade, infer the
 * term window, and assign a deterministic course color. Everything the Home
 * screen's number line needs is computed here at sync time and written into
 * `inbox/study-sources/<course>.json` (schema 2); the app never re-derives
 * weights from raw Canvas payloads.
 */

/**
 * Categorical course palette: the dataviz reference set (8 slots, fixed order,
 * light + dark steps of the same hues). Validated 2026-09-18 with
 * `dataviz/scripts/validate_palette.js` on Paper (#faf8f3), Night (#0c1018),
 * Forest (#0b1410) and Contrast (#000000) surfaces: every hard gate passes
 * (worst adjacent CVD ΔE 9.1 light / 8.4 dark; normal-vision 19.6 / 19.3).
 * Light-mode contrast WARN on aqua/yellow/magenta is relieved by the visible
 * course label on every row (identity is never color-alone).
 */
export const COURSE_PALETTE = [
  { name: "blue", light: "#2a78d6", dark: "#3987e5" },
  { name: "orange", light: "#eb6834", dark: "#d95926" },
  { name: "aqua", light: "#1baf7a", dark: "#199e70" },
  { name: "yellow", light: "#eda100", dark: "#c98500" },
  { name: "magenta", light: "#e87ba4", dark: "#d55181" },
  { name: "green", light: "#008300", dark: "#008300" },
  { name: "violet", light: "#4a3aa7", dark: "#9085e9" },
  { name: "red", light: "#e34948", dark: "#e66767" },
];

/** FNV-1a over the course id string — stable across runs and machines. */
export function hashCourseId(courseId) {
  const text = String(courseId ?? "");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Deterministic palette slot for a course. When the caller passes the slots
 * already taken by other courses in the same sync, collisions are resolved by
 * walking forward so four courses always get four distinct colors (up to the
 * palette size); the walk is itself deterministic given a sorted course list.
 */
export function courseColorIndex(courseId, taken = new Set()) {
  const start = hashCourseId(courseId) % COURSE_PALETTE.length;
  for (let step = 0; step < COURSE_PALETTE.length; step++) {
    const idx = (start + step) % COURSE_PALETTE.length;
    if (!taken.has(idx)) return idx;
  }
  return start;
}

export function assignCourseColors(courseIds) {
  const taken = new Set();
  const out = new Map();
  for (const id of [...courseIds].map(String).sort()) {
    const idx = courseColorIndex(id, taken);
    taken.add(idx);
    out.set(id, idx);
  }
  return out;
}

export const EXAM_RE = /\b(exam|midterm|final|test)\b/i;
export const QUIZ_RE = /\bquiz(zes)?\b/i;

/**
 * Item kind for the number line. Exams outrank quizzes: "Final Exam" is an
 * exam even when Canvas delivers it as a quiz. Discussions are graded
 * discussion topics; "other" is anything with no submission and no points.
 */
export function classifyKind(assignment) {
  const title = String(assignment?.name || assignment?.title || "");
  const types = Array.isArray(assignment?.submission_types) ? assignment.submission_types : [];
  const quizType = String(assignment?.quiz_type || "");
  if (EXAM_RE.test(title)) return "exam";
  if (QUIZ_RE.test(title) || assignment?.is_quiz_assignment || types.includes("online_quiz") || quizType) return "quiz";
  if (types.includes("discussion_topic")) return "discussion";
  const points = Number(assignment?.points_possible);
  if (types.length === 0 || types.includes("none") || types.includes("not_graded")) {
    if (!(points > 0)) return "other";
  }
  return "assignment";
}

/**
 * Share of the course grade per item, as a fraction in [0, 1].
 *
 * Weighted courses (any assignment group with group_weight > 0):
 *   share = (group_weight / Σ group_weight) × (points / Σ points in that group)
 * Unweighted courses:
 *   share = points / Σ points across all graded items
 * Zero-point or ungraded items get 0 (the line draws them at the minimum tick).
 * Groups with weight but no pointed items contribute nothing (Canvas drops
 * them from the grade too) — their weight is excluded from the denominator.
 */
export function computeWeightShares(items, groups = []) {
  const groupById = new Map();
  for (const g of groups || []) {
    if (g?.id == null) continue;
    groupById.set(String(g.id), { id: String(g.id), name: String(g.name || ""), weight: Number(g.group_weight) || 0, total: 0 });
  }
  const pointsOf = (item) => {
    const p = Number(item?.points_possible);
    return Number.isFinite(p) && p > 0 ? p : 0;
  };
  for (const item of items) {
    const g = groupById.get(String(item.assignment_group_id ?? ""));
    if (g) g.total += pointsOf(item);
  }
  const usesWeights = [...groupById.values()].some((g) => g.weight > 0);
  const shares = new Map();
  if (usesWeights) {
    const weightSum = [...groupById.values()].filter((g) => g.weight > 0 && g.total > 0).reduce((acc, g) => acc + g.weight, 0);
    for (const item of items) {
      const g = groupById.get(String(item.assignment_group_id ?? ""));
      const p = pointsOf(item);
      if (!g || g.weight <= 0 || g.total <= 0 || weightSum <= 0 || p <= 0) {
        shares.set(item.id, 0);
      } else {
        shares.set(item.id, (g.weight / weightSum) * (p / g.total));
      }
    }
  } else {
    const total = items.reduce((acc, item) => acc + pointsOf(item), 0);
    for (const item of items) {
      const p = pointsOf(item);
      shares.set(item.id, total > 0 && p > 0 ? p / total : 0);
    }
  }
  return {
    uses_group_weights: usesWeights,
    groups: [...groupById.values()].map((g) => ({ id: g.id, name: g.name, group_weight: g.weight, total_points: g.total })),
    total_points: items.reduce((acc, item) => acc + pointsOf(item), 0),
    shares,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseInstant(value) {
  if (!value) return null;
  const t = Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

function iso(ms) {
  return new Date(ms).toISOString();
}

/**
 * Term window for the course row. Canvas `course.start_at/end_at` (course
 * override) or `course.term.start_at/end_at` win and are labeled "canvas".
 * Otherwise the window is inferred from due dates: first due − 7d, last due
 * + 7d, labeled "inferred". With neither, the window is null and labeled
 * "none" — the UI must not draw an axis end it cannot justify.
 */
export function inferTerm(course, items = []) {
  const canvasStart = parseInstant(course?.start_at) ?? parseInstant(course?.term?.start_at);
  const canvasEnd = parseInstant(course?.end_at) ?? parseInstant(course?.term?.end_at);
  const dues = items.map((i) => parseInstant(i?.due_at)).filter((t) => t != null);
  const firstDue = dues.length ? Math.min(...dues) : null;
  const lastDue = dues.length ? Math.max(...dues) : null;
  const start = canvasStart ?? (firstDue != null ? firstDue - 7 * DAY_MS : null);
  const end = canvasEnd ?? (lastDue != null ? lastDue + 7 * DAY_MS : null);
  let source;
  if (canvasStart != null && canvasEnd != null) source = "canvas";
  else if (start != null && end != null) source = canvasStart != null || canvasEnd != null ? "mixed" : "inferred";
  else source = "none";
  return {
    start_at: start != null ? iso(start) : null,
    end_at: end != null ? iso(end) : null,
    source,
    start_source: canvasStart != null ? "canvas" : start != null ? "inferred" : "none",
    end_source: canvasEnd != null ? "canvas" : end != null ? "inferred" : "none",
  };
}

/**
 * Build the graded-item list for one course from assignments (+ quizzes not
 * mirrored as assignments) and assignment groups. Submission state is copied
 * only when Canvas returned it (`include[]=submission`); nothing is inferred.
 */
export function buildItems(courseId, assignments = [], quizzes = [], groups = []) {
  const rows = [];
  const seenQuizIds = new Set();
  for (const a of assignments || []) {
    if (a?.id == null) continue;
    if (a.quiz_id != null) seenQuizIds.add(String(a.quiz_id));
    const submission = a.submission && typeof a.submission === "object" ? a.submission : null;
    rows.push({
      id: `a${a.id}`,
      canvas_id: String(a.id),
      canvas_type: "assignment",
      kind: classifyKind(a),
      title: String(a.name || "Assignment"),
      due_at: a.due_at || null,
      unlock_at: a.unlock_at || null,
      points_possible: Number.isFinite(Number(a.points_possible)) ? Number(a.points_possible) : null,
      assignment_group_id: a.assignment_group_id != null ? String(a.assignment_group_id) : null,
      html_url: a.html_url || null,
      submission_types: Array.isArray(a.submission_types) ? a.submission_types.map(String) : [],
      published: a.published !== false,
      source_id: a.description && String(a.description).trim() ? `assignment-${a.id}` : null,
      submitted: submission ? Boolean(submission.submitted_at) : null,
      graded: submission ? submission.workflow_state === "graded" : null,
      score: submission && submission.score != null ? Number(submission.score) : null,
    });
  }
  for (const q of quizzes || []) {
    if (q?.id == null || seenQuizIds.has(String(q.id))) continue;
    if (q.assignment_id != null && rows.some((r) => r.canvas_id === String(q.assignment_id))) continue;
    rows.push({
      id: `q${q.id}`,
      canvas_id: String(q.id),
      canvas_type: "quiz",
      kind: EXAM_RE.test(String(q.title || "")) ? "exam" : "quiz",
      title: String(q.title || "Quiz"),
      due_at: q.due_at || null,
      unlock_at: q.unlock_at || null,
      points_possible: Number.isFinite(Number(q.points_possible)) ? Number(q.points_possible) : null,
      assignment_group_id: q.assignment_group_id != null ? String(q.assignment_group_id) : null,
      html_url: q.html_url || null,
      submission_types: ["online_quiz"],
      published: q.published !== false,
      source_id: null,
      submitted: null,
      graded: null,
      score: null,
    });
  }
  const grading = computeWeightShares(rows, groups);
  for (const row of rows) {
    row.group_weight = grading.groups.find((g) => g.id === row.assignment_group_id)?.group_weight ?? null;
    row.group_name = grading.groups.find((g) => g.id === row.assignment_group_id)?.name ?? null;
    row.weight_share = round6(grading.shares.get(row.id) ?? 0);
  }
  rows.sort((x, y) => (parseInstant(x.due_at) ?? Number.MAX_SAFE_INTEGER) - (parseInstant(y.due_at) ?? Number.MAX_SAFE_INTEGER));
  return {
    items: rows,
    grading: {
      uses_group_weights: grading.uses_group_weights,
      groups: grading.groups,
      total_points: grading.total_points,
    },
  };
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}
