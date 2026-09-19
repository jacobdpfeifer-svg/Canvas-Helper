/**
 * Study sources sync — SSO cookies → Canvas /api/v1 → inbox/study-sources/.
 *
 * Fetches instructor-published material a student may practice against
 * (syllabus, published pages, assignment descriptions) plus exam-date
 * candidates, per active course. Writes one JSON record per course and a
 * status.json the app shows honestly (last sync, failures, session state).
 * Never fetches quiz questions, submissions, or grades; never posts anything.
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
import { MAX_PAGES, courseRecord } from "./lib/study-sources.mjs";

const outDir = path.join(resolveUserRoot({ create: true }), "inbox", "study-sources");
fs.mkdirSync(outDir, { recursive: true });
const statusPath = path.join(outDir, "status.json");
const startedAt = new Date().toISOString();

function writeStatus(status) {
  const tmp = `${statusPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(status, null, 2));
  fs.renameSync(tmp, statusPath);
}

let context;
let page;
try {
  ({ context, page } = await launchCanvasContext({ headless: true }));
  await requireLoggedIn(page);
} catch (e) {
  writeStatus({ schema: 1, started_at: startedAt, finished_at: new Date().toISOString(), ok: false, session: "expired_or_missing", error: String(e?.message || e), courses: [] });
  console.error(`Canvas session unavailable: ${String(e?.message || e)}`);
  if (context) await context.close();
  process.exit(1);
}

const errors = [];
const courseSummaries = [];
try {
  const coursesRes = await apiAllPages(page, "/api/v1/courses", {
    enrollment_state: "active",
    "include[]": "syllabus_body",
  });
  if (!coursesRes.ok) {
    throw new Error(`courses API failed (${coursesRes.status})`);
  }
  for (const course of coursesRes.items || []) {
    if (!course?.id || course.access_restricted_by_date) continue;
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
    const assignmentsRes = await apiAllPages(page, `/api/v1/courses/${course.id}/assignments`, { per_page: "100" });
    if (!assignmentsRes.ok) courseErrors.push(`assignments: ${assignmentsRes.status}`);
    const quizzesRes = await apiAllPages(page, `/api/v1/courses/${course.id}/quizzes`, { per_page: "100" });
    if (!quizzesRes.ok) courseErrors.push(`quizzes: ${quizzesRes.status}`);
    const record = courseRecord({
      course,
      syllabus: course.syllabus_body,
      pages: pageBodies,
      assignments: assignmentsRes.items || [],
      quizzes: quizzesRes.items || [],
      fetchedAt: new Date().toISOString(),
      errors: courseErrors,
      truncated,
    });
    const target = path.join(outDir, `${course.id}.json`);
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2));
    fs.renameSync(tmp, target);
    courseSummaries.push({ id: String(course.id), label: record.course.label, sources: record.sources.length, exams: record.exams.length, errors: courseErrors.length });
    console.log(`${record.course.label}: ${record.sources.length} sources, ${record.exams.length} exam candidates${courseErrors.length ? `, ${courseErrors.length} errors` : ""}`);
  }
} catch (e) {
  errors.push(String(e?.message || e));
}
writeStatus({
  schema: 1,
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  ok: errors.length === 0,
  partial: courseSummaries.some((c) => c.errors > 0),
  session: "ok",
  errors,
  courses: courseSummaries,
});
await context.close();
process.exit(errors.length ? 1 : 0);
