/**
 * Grade scenarios: Canvas reported, graded-only, risk-adjusted, what-if.
 * Never silently renormalize weights. Never invent zeros for unknown items.
 */
import { GRADE_SCENARIOS } from "./canvas-model.mjs";

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function result({ status, scenario, percent, letter = null, included = [], excluded = [], warnings = [], sources = [], as_of }) {
  return {
    status,
    scenario,
    percent: percent == null ? null : Math.round(percent * 10) / 10,
    letter,
    included_item_ids: included,
    excluded_item_ids: excluded,
    warnings,
    sources,
    as_of,
  };
}

function refuse(scenario, reason, ids, as_of, extra = {}) {
  return result({
    status: "cannot_calculate",
    scenario,
    percent: null,
    included: [],
    excluded: ids,
    warnings: [{ code: reason, item_ids: ids, ...extra }],
    sources: extra.sources || [],
    as_of,
  });
}

function itemId(a) {
  return String(a.id ?? a.canvas_id);
}

function isGradedType(a) {
  return String(a.grading_type || "points") !== "not_graded" && num(a.points_possible) > 0;
}

function postedScore(a, whatIf) {
  const override = whatIf?.[itemId(a)];
  if (override && override.replace_score != null) return num(override.replace_score);
  if (override && override.add_zero) return 0;
  const sub = a.submission || {};
  if (sub.score == null) return null;
  return num(sub.score);
}

function isPosted(a) {
  const sub = a.submission || {};
  return Boolean(sub.posted_at) || (sub.score != null && sub.workflow_state === "graded" && sub.hide_grade !== true);
}

function dueUnsubmitted(a, now) {
  const due = a.due_at || a.effective_due_at;
  const sub = a.submission || {};
  const wf = String(sub.workflow_state || "");
  const submitted = Boolean(sub.submitted_at) || wf === "submitted" || wf === "graded" || wf === "pending_review";
  if (submitted) return false;
  if (!due) return false;
  const t = Date.parse(due);
  return Number.isFinite(t) && t <= now;
}

function dropWithinGroup(items, rules = {}) {
  const dropLow = Number(rules.drop_lowest || 0);
  const dropHigh = Number(rules.drop_highest || 0);
  const never = new Set((rules.never_drop || []).map(String));
  const scored = items.filter((it) => it.score != null && it.possible > 0);
  const droppable = scored.filter((it) => !never.has(String(it.id)));
  droppable.sort((a, b) => a.score / a.possible - b.score / b.possible);
  const dropped = new Set();
  for (let i = 0; i < dropLow && i < droppable.length; i++) dropped.add(droppable[i].id);
  const remaining = droppable.filter((it) => !dropped.has(it.id));
  remaining.sort((a, b) => b.score / b.possible - a.score / a.possible);
  for (let i = 0; i < dropHigh && i < remaining.length; i++) dropped.add(remaining[i].id);
  return dropped;
}

function groupPercent(assignments, group, { mode, now, whatIf, as_of }) {
  const included = [];
  const excluded = [];
  const warnings = [];
  const rows = [];
  for (const a of assignments) {
    const id = itemId(a);
    if (!isGradedType(a)) {
      excluded.push(id);
      continue;
    }
    const possible = num(a.points_possible) || 0;
    let score = postedScore(a, whatIf);
    const hidden = a.submission && a.submission.score != null && !isPosted(a);
    if (mode === "graded_only") {
      if (score == null) {
        excluded.push(id);
        continue;
      }
      if (hidden) {
        warnings.push({ code: "hidden_unposted", item_ids: [id] });
        return { abort: "hidden", warnings, included, excluded };
      }
    } else if (mode === "risk_adjusted") {
      if (score == null && dueUnsubmitted(a, now) && a.published !== false && !a.locked) {
        score = 0;
      } else if (score == null) {
        excluded.push(id);
        if (!a.effective_due_at && !a.due_at) warnings.push({ code: "outside_risk_denominator", item_ids: [id], why: "no-date" });
        else if (a.due_at && Date.parse(a.due_at) > now) warnings.push({ code: "outside_risk_denominator", item_ids: [id], why: "future" });
        continue;
      }
    } else if (mode === "what_if") {
      if (score == null) {
        excluded.push(id);
        continue;
      }
    }
    rows.push({ id, score, possible, assignment: a });
    included.push(id);
  }
  const dropped = dropWithinGroup(rows, group.rules || {});
  let earned = 0;
  let possible = 0;
  const keptIncluded = [];
  for (const row of rows) {
    if (dropped.has(row.id)) {
      excluded.push(row.id);
      continue;
    }
    earned += row.score;
    possible += row.possible;
    keptIncluded.push(row.id);
  }
  if (possible <= 0) return { percent: null, included: keptIncluded, excluded, warnings };
  return { percent: (earned / possible) * 100, included: keptIncluded, excluded, warnings };
}

export function compute_grade_scenarios({
  course,
  assignments = [],
  assignmentGroups = [],
  now = Date.now(),
  as_of,
  whatIf = {},
} = {}) {
  const enrollment = (course?.enrollments || [])[0] || {};
  const reportedScore = num(enrollment.computed_current_score);
  const reportedLetter = enrollment.computed_current_grade || null;
  const sources = [
    {
      kind: "enrollment.computed_current_score",
      as_of,
      endpoint: "/api/v1/courses?include[]=total_scores",
    },
  ];

  const canvas_reported = result({
    status: reportedScore == null ? "cannot_calculate" : "ok",
    scenario: "canvas_reported",
    percent: reportedScore,
    letter: reportedLetter,
    included: [],
    excluded: [],
    warnings: reportedScore == null ? [{ code: "no_computed_score" }] : [],
    sources,
    as_of,
  });

  const byGroup = new Map();
  for (const g of assignmentGroups) byGroup.set(String(g.id), { ...g, assignments: [] });
  const missingGroup = [];
  for (const a of assignments) {
    const gid = a.assignment_group_id != null ? String(a.assignment_group_id) : null;
    if (!gid || !byGroup.has(gid)) {
      missingGroup.push(itemId(a));
      continue;
    }
    byGroup.get(gid).assignments.push(a);
  }

  const closed = Boolean(course?.closed_grading_period);
  const weightSum = [...byGroup.values()].reduce((s, g) => s + (num(g.group_weight) || 0), 0);
  const useWeights = [...byGroup.values()].some((g) => num(g.group_weight) > 0);

  function scenario(mode) {
    if (closed && mode !== "canvas_reported") {
      return refuse(mode, "closed_grading_period", [], as_of);
    }
    if (missingGroup.length && mode !== "canvas_reported") {
      return refuse(mode, "missing_group_membership", missingGroup, as_of);
    }
    if (!byGroup.size && mode !== "canvas_reported") {
      return refuse(mode, "no_assignment_groups", [], as_of);
    }
    const warnings = [];
    const included = [];
    const excluded = [];
    let contrib = 0;
    let weightUsed = 0;
    if (useWeights) {
      if (Math.abs(weightSum - 100) > 0.05) {
        warnings.push({ code: "weights_not_100", observed_sum: weightSum });
      }
      for (const g of byGroup.values()) {
        const gp = groupPercent(g.assignments, g, { mode, now, whatIf, as_of });
        if (gp.abort === "hidden") {
          const canChangeDenom = true;
          const status = canvas_reported.percent != null ? "partial" : "cannot_calculate";
          return result({
            status: status === "partial" ? "partial" : "cannot_calculate",
            scenario: mode,
            percent: status === "partial" ? null : null,
            included: gp.included,
            excluded: gp.excluded,
            warnings: [...warnings, ...gp.warnings, { code: "hidden_unposted_changes_denominator" }],
            sources,
            as_of,
          });
        }
        included.push(...gp.included);
        excluded.push(...gp.excluded);
        warnings.push(...(gp.warnings || []));
        const w = num(g.group_weight) || 0;
        if (gp.percent == null) continue;
        contrib += (gp.percent / 100) * w;
        weightUsed += w;
      }
      const percent = weightUsed > 0 ? contrib : null;
      const status = warnings.some((w) => w.code === "weights_not_100") ? "partial" : "ok";
      if (warnings.some((w) => w.code === "weights_not_100")) {
        warnings.push({
          code: "not_renormalized",
          observed_sum: weightSum,
          normalized_diagnostic: weightSum > 0 ? (contrib / weightSum) * 100 : null,
        });
      }
      if (percent == null) return refuse(mode, "empty_denominator", excluded, as_of, { warnings });
      return result({ status, scenario: mode, percent, included, excluded, warnings, sources, as_of });
    }
    const fake = { rules: {}, assignments };
    const gp = groupPercent(assignments, fake, { mode, now, whatIf, as_of });
    if (gp.abort === "hidden") {
      return result({
        status: canvas_reported.percent != null ? "partial" : "cannot_calculate",
        scenario: mode,
        percent: null,
        included: gp.included,
        excluded: gp.excluded,
        warnings: gp.warnings,
        sources,
        as_of,
      });
    }
    if (gp.percent == null) return refuse(mode, "empty_denominator", gp.excluded, as_of, { warnings: gp.warnings });
    return result({
      status: "ok",
      scenario: mode,
      percent: gp.percent,
      included: gp.included,
      excluded: gp.excluded,
      warnings: gp.warnings,
      sources,
      as_of,
    });
  }

  const graded_only = scenario("graded_only");
  const risk_adjusted = scenario("risk_adjusted");
  const what_if = Object.keys(whatIf).length ? scenario("what_if") : result({
    status: "ok",
    scenario: "what_if",
    percent: null,
    included: [],
    excluded: [],
    warnings: [{ code: "no_what_if_overrides" }],
    sources,
    as_of,
  });

  const lead = {
    canvas_says: canvas_reported.percent,
    canvas_letter: canvas_reported.letter,
    unsubmitted_due_count: assignments.filter((a) => dueUnsubmitted(a, now) && isGradedType(a)).length,
    risk: risk_adjusted.percent,
    why: "Canvas calculates from graded work; risk-adjusted treats currently due unsubmitted items as zero.",
  };

  return {
    course_id: String(course?.id || ""),
    as_of,
    canvas_reported,
    graded_only,
    risk_adjusted,
    what_if,
    lead,
    scenarios: GRADE_SCENARIOS,
  };
}
