/**
 * Declared fetch matrix → in-memory generation. Inject apiAllPages/api for tests.
 */
import { SCHEMA_VERSION, hashProfileId, sanitizeForLog } from "./canvas-model.mjs";
import { getSchoolConfig } from "./school-config.mjs";

export const FETCH_MATRIX = {
  global: ["courses", "planner", "todo", "missing_submissions", "calendar_assignments", "calendar_events"],
  course: ["assignments", "assignment_groups", "discussions", "quizzes", "submissions", "modules"],
};

const CONCURRENCY = 3;

async function poolMap(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function endpointResult(res, name) {
  return {
    name,
    ok: Boolean(res?.ok),
    status: res?.status ?? 0,
    truncated: Boolean(res?.truncated || res?.partial),
    count: Array.isArray(res?.items) ? res.items.length : 0,
    items: res?.ok || res?.partial ? res.items || [] : [],
  };
}

export async function fetchCanonicalGeneration(page, {
  apiAllPages,
  api,
  sync_id,
  profile_id = "dev",
  started_at,
  daysAhead = 150,
} = {}) {
  const school = getSchoolConfig();
  const tenant_id = school.slug || "unknown";
  const timezone = school.timezone || "UTC";
  const started = started_at || new Date().toISOString();
  const requested = [...FETCH_MATRIX.global, ...FETCH_MATRIX.course];
  const completed = [];
  const failed_endpoints = [];
  const pagination = [];
  const named_courses_failed = [];

  const coursesRes = await apiAllPages(page, "/api/v1/courses", {
    enrollment_state: "active",
    "include[]": ["total_scores", "current_grading_period_scores", "syllabus_body", "term"],
  });
  const coursesEp = endpointResult(coursesRes, "courses");
  if (!coursesEp.ok) {
    failed_endpoints.push({ endpoint: "courses", status: coursesEp.status, detail: sanitizeForLog(coursesEp.status) });
    throw new Error(`Courses API failed (${coursesEp.status}). Re-run open-canvas or check session.`);
  }
  completed.push("courses");
  if (coursesEp.truncated) pagination.push({ endpoint: "courses", truncated: true });
  const courses = (coursesRes.items || []).filter((c) => c?.id && !c.access_restricted_by_date);

  const now = new Date();
  const startIso = new Date(now.getTime() - 30 * 86400000).toISOString();
  const end = new Date(now.getTime() + Number(daysAhead || 150) * 86400000);
  const endIso = end.toISOString();
  const startDay = startIso.slice(0, 10);
  const endDay = endIso.slice(0, 10);

  const plannerRes = await apiAllPages(page, "/api/v1/planner/items", { start_date: startIso, end_date: endIso });
  const plannerEp = endpointResult(plannerRes, "planner");
  if (plannerEp.ok) completed.push("planner");
  else failed_endpoints.push({ endpoint: "planner", status: plannerEp.status });
  if (plannerEp.truncated) pagination.push({ endpoint: "planner", truncated: true });

  const todoRes = await apiAllPages(page, "/api/v1/users/self/todo", {});
  const todoEp = endpointResult(todoRes, "todo");
  if (todoEp.ok) completed.push("todo");
  else failed_endpoints.push({ endpoint: "todo", status: todoEp.status });
  if (todoEp.truncated) pagination.push({ endpoint: "todo", truncated: true });

  const missingRes = await apiAllPages(page, "/api/v1/users/self/missing_submissions", {
    "include[]": ["course", "planner_overrides"],
  });
  const missingEp = endpointResult(missingRes, "missing_submissions");
  if (missingEp.ok) completed.push("missing_submissions");
  else failed_endpoints.push({ endpoint: "missing_submissions", status: missingEp.status });
  if (missingEp.truncated) pagination.push({ endpoint: "missing_submissions", truncated: true });

  const contextCodes = courses.map((c) => `course_${c.id}`);
  let calAssign = { ok: true, items: [], truncated: false, status: 200 };
  let calEvents = { ok: true, items: [], truncated: false, status: 200 };
  if (contextCodes.length) {
    calAssign = await apiAllPages(page, "/api/v1/calendar_events", {
      type: "assignment",
      start_date: startDay,
      end_date: endDay,
      "context_codes[]": contextCodes,
      all_events: "true",
    });
    calEvents = await apiAllPages(page, "/api/v1/calendar_events", {
      type: "event",
      start_date: startDay,
      end_date: endDay,
      "context_codes[]": contextCodes,
      all_events: "true",
    });
  }
  const calA = endpointResult(calAssign, "calendar_assignments");
  const calE = endpointResult(calEvents, "calendar_events");
  if (calA.ok) completed.push("calendar_assignments");
  else failed_endpoints.push({ endpoint: "calendar_assignments", status: calA.status });
  if (calE.ok) completed.push("calendar_events");
  else failed_endpoints.push({ endpoint: "calendar_events", status: calE.status });
  if (calA.truncated) pagination.push({ endpoint: "calendar_assignments", truncated: true });
  if (calE.truncated) pagination.push({ endpoint: "calendar_events", truncated: true });

  const packs = await poolMap(courses, CONCURRENCY, async (course) => {
    const id = course.id;
    const courseErrors = [];
    async function grab(name, pathBase, params) {
      const res = await apiAllPages(page, pathBase, params);
      const ep = endpointResult(res, `${name}:${id}`);
      if (!ep.ok && ep.status === 404) {
        // A 404 on a per-course sub-resource (e.g. Classic Quizzes disabled/migrated
        // to New Quizzes) means the feature is off for this course, not a fetch
        // failure — don't fail the whole course sync over it.
        ep.ok = true;
        ep.items = [];
      }
      if (!ep.ok) {
        courseErrors.push(name);
        failed_endpoints.push({ endpoint: `${name}:${id}`, status: ep.status });
      } else if (!completed.includes(name)) completed.push(name);
      if (ep.truncated) pagination.push({ endpoint: `${name}:${id}`, truncated: true });
      return ep;
    }
    const assignments = await grab("assignments", `/api/v1/courses/${id}/assignments`, {
      "include[]": ["submission", "all_dates", "assignment_visibility"],
      per_page: "100",
    });
    const groups = await grab("assignment_groups", `/api/v1/courses/${id}/assignment_groups`, {
      "include[]": ["assignments"],
      per_page: "50",
    });
    const discussions = await grab("discussions", `/api/v1/courses/${id}/discussion_topics`, {
      "include[]": ["assignment", "all_dates"],
    });
    const quizzes = await grab("quizzes", `/api/v1/courses/${id}/quizzes`, { per_page: "100" });
    const modules = await grab("modules", `/api/v1/courses/${id}/modules`, {
      "include[]": ["items", "content_details"],
    });
    if (modules.ok) {
      for (const mod of modules.items) {
        if ((!mod.items || !mod.items.length) && api) {
          const extra = await apiAllPages(page, `/api/v1/courses/${id}/modules/${mod.id}/items`, {
            "include[]": ["content_details"],
          });
          if (extra.ok) mod.items = extra.items;
          else {
            courseErrors.push("module_items");
            failed_endpoints.push({ endpoint: `module_items:${id}:${mod.id}`, status: extra.status });
          }
          if (extra.truncated) pagination.push({ endpoint: `module_items:${id}:${mod.id}`, truncated: true });
        }
      }
    }
    const submissions = {
      ok: true,
      items: (assignments.items || []).map((a) => a.submission).filter(Boolean),
      truncated: false,
    };
    // Derived from the assignments fetch above (no separate API call), so mark
    // it covered whenever assignments succeeded — otherwise "submissions" would
    // never appear in coverage.completed even on a fully successful sync.
    if (assignments.ok && !completed.includes("submissions")) completed.push("submissions");
    if (courseErrors.length) named_courses_failed.push(String(id));
    let pages = [];
    try {
      const pagesRes = await apiAllPages(page, `/api/v1/courses/${id}/pages`, { published: "true", per_page: "20" });
      if (pagesRes.ok) {
        pages = (pagesRes.items || []).slice(0, 20);
        for (const p of pages.slice(0, 5)) {
          if (!api) break;
          const one = await api(page, `/api/v1/courses/${id}/pages/${encodeURIComponent(p.url)}`);
          if (one.ok && one.json) Object.assign(p, one.json);
        }
      }
    } catch {
      /* pages optional */
    }
    return {
      course,
      assignments: assignments.items,
      "assignment-groups": (groups.items || []).map((g) => ({
        ...g,
        rules: g.rules || {},
      })),
      submissions: submissions.items,
      modules: modules.items,
      discussions: discussions.items,
      quizzes: quizzes.items,
      pages,
    };
  });

  const finished_at = new Date().toISOString();
  const complete = failed_endpoints.length === 0 && pagination.length === 0 && named_courses_failed.length === 0;
  return {
    tenant_id,
    timezone,
    fetched_at: finished_at,
    courses: packs,
    global: {
      planner: plannerEp.items,
      todo: todoEp.items,
      "missing-submissions": missingEp.items,
      "calendar-events": [...calA.items, ...calE.items],
    },
    manifest: {
      schema_version: SCHEMA_VERSION,
      sync_id,
      tenant_id,
      profile_id_hash: hashProfileId(profile_id),
      started_at: started,
      finished_at,
      timezone,
      requested_endpoints: requested,
      completed_endpoints: [...new Set(completed)],
      failed_endpoints,
      named_courses_failed,
      pagination,
      file_hashes: {},
      complete,
      usable_partial: !complete && packs.length > 0,
      calendar_window: { start: startDay, end: endDay },
    },
  };
}
