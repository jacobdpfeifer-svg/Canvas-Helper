/**
 * "Cost of skipping": the grade impact of taking a zero on upcoming work,
 * computed with the same engine as grade-truth (drop rules, weights, hidden
 * scores). Never a recommendation to skip — it lets the student make an
 * informed call about their own time.
 *
 * The engine deliberately does not renormalize weights (a course with only
 * one graded group reads "18" meaning 18 of 100 final points so far). A
 * student compares against the grade Canvas shows, so the numbers here are
 * renormalized over the groups that actually have graded work, the way
 * Canvas's own current grade is. `share_of_final` is the item's weight in the
 * final grade (weighted courses only), independent of current scores.
 */
import { compute_grade_scenarios } from "./canvas-grades.mjs";

const HORIZON_MS = 21 * 24 * 60 * 60 * 1000;
const LOOKBACK_MS = 2 * 24 * 60 * 60 * 1000;

function num(v) {
  const n = Number(v);
  return v == null || v === "" || !Number.isFinite(n) ? null : n;
}

function submitted(a) {
  const sub = a.submission || {};
  const wf = String(sub.workflow_state || "");
  return Boolean(sub.submitted_at) || wf === "submitted" || wf === "graded" || wf === "pending_review";
}

function graded(a) {
  return String(a.grading_type || "points") !== "not_graded" && num(a.points_possible) > 0;
}

function round1(v) {
  return v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10;
}

/** Engine percent → Canvas-style current grade (renormalized over graded groups). */
function renormalize(result, { weighted, groupOf, weightOf }) {
  if (result?.percent == null) return null;
  if (!weighted) return result.percent;
  const groups = new Set((result.included_item_ids || []).map((id) => groupOf.get(String(id))).filter(Boolean));
  const used = [...groups].reduce((sum, g) => sum + (weightOf.get(g) || 0), 0);
  return used > 0 ? (result.percent * 100) / used : null;
}

/**
 * Share of the final grade this one item carries (0–100). Only for weighted
 * courses: group weights come from the syllabus, so the share is stable. In a
 * points-based course the total isn't known until the term ends (early on,
 * one posted assignment would read "100%"), so no share is claimed there.
 */
function shareOfFinal(a, { weighted, assignments, weightOf, weightSum }) {
  if (!weighted) return null;
  const points = num(a.points_possible) || 0;
  const gid = String(a.assignment_group_id);
  const groupTotal = assignments
    .filter((x) => graded(x) && String(x.assignment_group_id) === gid)
    .reduce((s, x) => s + (num(x.points_possible) || 0), 0);
  const w = weightOf.get(gid) || 0;
  return groupTotal > 0 && weightSum > 0 ? ((w / weightSum) * 100 * points) / groupTotal : null;
}

/**
 * @param {object} generation canonical generation
 * @returns {Record<string, object>} keyed `${course_id}:${assignment_id}`
 */
export function computeSkipCosts(generation, { now = Date.now() } = {}) {
  const out = {};
  const asOf = generation?.manifest?.finished_at || new Date(now).toISOString();
  for (const pack of generation?.courses || []) {
    const course = pack.course || {};
    const groups = pack["assignment-groups"] || [];
    const assignments = pack.assignments || [];
    const upcoming = assignments.filter((a) => {
      const due = Date.parse(a.due_at || "");
      return graded(a) && !submitted(a) && a.published !== false && Number.isFinite(due) && due >= now - LOOKBACK_MS && due <= now + HORIZON_MS;
    });
    if (!upcoming.length) continue;
    const weightOf = new Map(groups.map((g) => [String(g.id), num(g.group_weight) || 0]));
    const weightSum = [...weightOf.values()].reduce((s, w) => s + w, 0);
    const frame = {
      weighted: [...weightOf.values()].some((w) => w > 0),
      groupOf: new Map(assignments.map((a) => [String(a.id), String(a.assignment_group_id)])),
      weightOf,
    };
    const common = { course, assignments, assignmentGroups: groups, now, as_of: asOf };
    const base = compute_grade_scenarios(common).graded_only;
    for (const a of upcoming) {
      const id = String(a.id);
      const zero = compute_grade_scenarios({ ...common, whatIf: { [id]: { add_zero: true } } }).what_if;
      const full = compute_grade_scenarios({ ...common, whatIf: { [id]: { replace_score: num(a.points_possible) } } }).what_if;
      const warnings = [...new Set([...(zero.warnings || []), ...(full.warnings || [])].map((w) => w.code))].filter(
        (code) => code !== "no_what_if_overrides"
      );
      const ifZero = renormalize(zero, frame);
      const ifFull = renormalize(full, frame);
      const usable = ifZero != null && ifFull != null;
      out[`${course.id}:${id}`] = {
        course_id: String(course.id),
        assignment_id: id,
        title: a.name,
        points_possible: num(a.points_possible),
        due_at: a.due_at,
        current: round1(renormalize(base, frame)),
        if_zero: round1(ifZero),
        if_full: round1(ifFull),
        swing: usable ? round1(ifFull - ifZero) : null,
        share_of_final: usable ? round1(shareOfFinal(a, { weighted: frame.weighted, assignments, weightOf, weightSum })) : null,
        status: !usable ? "cannot_calculate" : zero.status === "ok" && full.status === "ok" ? "ok" : "estimate",
        warnings,
        as_of: asOf,
      };
    }
  }
  return out;
}
