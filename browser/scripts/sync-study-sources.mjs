/**
 * Study sources sync — SSO cookies → Canvas /api/v1 → inbox/study-sources/.
 *
 * Fetches instructor-published material a student may practice against
 * (syllabus, published pages, assignment descriptions), every graded item
 * with its due date / points / assignment-group weight (for the Home semester
 * line), and exam-date candidates, per active course. Writes one JSON record
 * per course (schema 2, see lib/study-sources.mjs) and a status.json the app
 * shows honestly (last sync, failures, session state).
 *
 * Progress streaming (onboarding Screen 3): every line on stdout is one JSON
 * event — `{"event":"courses", ...}` once the course list is known, then
 * `{"event":"course", ...}` as each course finishes (with counts), then
 * `{"event":"done", ...}`. The Tauri daemon forwards these as
 * `study-sync-progress` window events; humans can read them too.
 *
 * Never fetches quiz questions or grades beyond the student's own submission
 * state (`include[]=submission`, read-only); never posts anything.
 *
 * Usage: cd browser && node scripts/sync-study-sources.mjs   (or npm run sync-sources)
 */
import fs from "node:fs";
import path from "node:path";
import {
  api,
  apiAllPages,
  launchCanvasContext,
  requireLoggedIn,
  resolveUserRoot,
} from "./lib/canvas-session.mjs";
import { MAX_PAGES, STUDY_SOURCES_SCHEMA, courseLabel, courseRecord } from "./lib/study-sources.mjs";
import { COURSE_PALETTE, assignCourseColors } from "./lib/semester.mjs";

const outDir = path.join(resolveUserRoot({ create: true }), "inbox", "study-sources");
fs.mkdirSync(outDir, { recursive: true });
const statusPath = path.join(outDir, "status.json");
const startedAt = new Date().toISOString();

function emit(event) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

function writeJson(target, value) {
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, target);
}

function countKinds(items) {
  const counts = { assignments: 0, quizzes: 0, exams: 0, discussions: 0, other: 0 };
  for (const item of items) {
    if (item.kind === "quiz") counts.quizzes++;
    else if (item.kind === "exam") counts.exams++;
    else if (item.kind === "discussion") counts.discussions++;
    else if (item.kind === "other") counts.other++;
    else counts.assignments++;
  }
  return counts;
}

let context;
let page;
try {
  ({ context, page } = await launchCanvasContext({ headless: true }));
  await requireLoggedIn(page);
} catch (e) {
  const message = String(e?.message || e);
  writeJson(statusPath, { schema: STUDY_SOURCES_SCHEMA, started_at: startedAt, finished_at: new Date().toISOString(), ok: false, session: "expired_or_missing", error: message, courses: [] });
  emit({ event: "done", ok: false, session: "expired_or_missing", error: message, courses: [] });
  console.error(`Canvas session unavailable: ${message}`);
  if (context) await context.close();
  process.exit(1);
}

const errors = [];
const courseSummaries = [];
try {
  const coursesRes = await apiAllPages(page, "/api/v1/courses", {
    enrollment_state: "active",
    "include[]": ["syllabus_body", "term"],
  });
  if (!coursesRes.ok) {
    throw new Error(`courses API failed (${coursesRes.status})`);
  }
  const courses = (coursesRes.items || []).filter((c) => c?.id && !c.access_restricted_by_date);
  const colors = assignCourseColors(courses.map((c) => c.id));
  emit({
    event: "courses",
    courses: courses.map((c) => ({
      id: String(c.id),
      label: courseLabel(c),
      color_index: colors.get(String(c.id)),
      color: COURSE_PALETTE[colors.get(String(c.id))],
    })),
  });
  for (const course of courses) {
    const courseErrors = [];
    let truncated = false;
    const pagesRes = await apiAllPages(page, `/api/v1/courses/${course.id}/pages`, { published: "true", per_page: "50" });
    const pageBodies = [];
    if (pagesRes.ok) {
      const list = (pagesRes.items || []).slice(0, MAX_PAGES);
      if ((pagesRes.items || []).length > MAX_PAGES) truncated = true;
      for (const p of list) {
        const one = await api(page, `/api/v1/courses/${course.id}/pages/${encodeURIComponent(p.url)}`);
        if (one.ok && one.json && typeof one.json === "object") pageBodies.push(one.json);
        else courseErrors.push(`page ${p.url}: ${one.status}`);
      }
    } else {
      courseErrors.push(`pages: ${pagesRes.status}`);
    }
    const groupsRes = await apiAllPages(page, `/api/v1/courses/${course.id}/assignment_groups`, { per_page: "100" });
    if (!groupsRes.ok) courseErrors.push(`assignment_groups: ${groupsRes.status}`);
    const assignmentsRes = await apiAllPages(page, `/api/v1/courses/${course.id}/assignments`, { per_page: "100", "include[]": ["submission"] });
    if (!assignmentsRes.ok) courseErrors.push(`assignments: ${assignmentsRes.status}`);
    const quizzesRes = await apiAllPages(page, `/api/v1/courses/${course.id}/quizzes`, { per_page: "100" });
    if (!quizzesRes.ok) courseErrors.push(`quizzes: ${quizzesRes.status}`);
    const record = courseRecord({
      course,
      syllabus: course.syllabus_body,
      pages: pageBodies,
      assignments: assignmentsRes.items || [],
      quizzes: quizzesRes.items || [],
      groups: groupsRes.items || [],
      fetchedAt: new Date().toISOString(),
      errors: courseErrors,
      truncated,
      colorIndex: colors.get(String(course.id)),
    });
    writeJson(path.join(outDir, `${course.id}.json`), record);
    const summary = {
      id: String(course.id),
      label: record.course.label,
      color_index: record.course.color_index,
      color: record.course.color,
      sources: record.sources.length,
      exams: record.exams.length,
      items: record.items.length,
      counts: countKinds(record.items),
      term_source: record.term.source,
      errors: courseErrors.length,
    };
    courseSummaries.push(summary);
    emit({ event: "course", ok: courseErrors.length === 0, course: summary, errors: courseErrors });
  }
} catch (e) {
  errors.push(String(e?.message || e));
}
const finalStatus = {
  schema: STUDY_SOURCES_SCHEMA,
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  ok: errors.length === 0,
  partial: courseSummaries.some((c) => c.errors > 0),
  session: "ok",
  errors,
  courses: courseSummaries,
};
writeJson(statusPath, finalStatus);
emit({ event: "done", ok: finalStatus.ok, partial: finalStatus.partial, session: "ok", errors, courses: courseSummaries });
await context.close();
process.exit(errors.length ? 1 : 0);
