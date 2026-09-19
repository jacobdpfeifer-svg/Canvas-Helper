/**
 * Pure helpers for the study-source sync (no network, no Playwright): shape
 * Canvas REST payloads into the `inbox/study-sources/<course>.json` record the
 * Python study core imports. Kept separate so `node --test` can cover them.
 */
import { stripHtmlTags } from "./canvas-session.mjs";
import { COURSE_PALETTE, buildItems, courseColorIndex, inferTerm } from "./semester.mjs";

export const MAX_TEXT_CHARS = 60_000;
export const MAX_PAGES = 40;
export const EXAM_TITLE_RE = /\b(exam|midterm|final|test|quiz)\b/i;

export function clip(text, max = MAX_TEXT_CHARS) {
  const value = String(text || "");
  return value.length > max ? { text: value.slice(0, max), truncated: true } : { text: value, truncated: false };
}

/** Course record used as the packet course label. */
export function courseLabel(course) {
  const code = String(course?.course_code || "").trim();
  const name = String(course?.name || "").trim();
  if (code && name && !name.startsWith(code)) return `${code} — ${name}`;
  return name || code || `course-${course?.id}`;
}

export function syllabusSource(course) {
  const body = course?.syllabus_body;
  if (!body || !String(body).trim()) return null;
  const { text, truncated } = clip(stripHtmlTags(body));
  if (!text) return null;
  return {
    id: `syllabus-${course.id}`,
    kind: "syllabus",
    title: "Syllabus",
    canvas_id: String(course.id),
    updated_at: course.updated_at || null,
    url: null,
    text,
    truncated,
  };
}

export function pageSource(courseId, page) {
  const { text, truncated } = clip(stripHtmlTags(page?.body || ""));
  if (!text) return null;
  return {
    id: `page-${page.page_id ?? page.url}`,
    kind: "page",
    title: String(page.title || page.url || "Page"),
    canvas_id: String(page.page_id ?? page.url),
    updated_at: page.updated_at || null,
    url: page.html_url || null,
    text,
    truncated,
    course_id: String(courseId),
  };
}

export function assignmentSource(courseId, assignment) {
  const { text, truncated } = clip(stripHtmlTags(assignment?.description || ""));
  if (!text) return null;
  return {
    id: `assignment-${assignment.id}`,
    kind: "assignment",
    title: String(assignment.name || "Assignment"),
    canvas_id: String(assignment.id),
    updated_at: assignment.updated_at || null,
    url: assignment.html_url || null,
    text,
    truncated,
    course_id: String(courseId),
  };
}

/**
 * Exam candidates inferred from titles/types. Labeled `inferred`: a Canvas
 * assignment named "Exam 1" is evidence of a date, not confirmation of scope.
 */
export function examCandidates(courseId, assignments = [], quizzes = []) {
  const rows = [];
  for (const a of assignments) {
    const title = String(a?.name || "");
    if (!EXAM_TITLE_RE.test(title) && !a?.is_quiz_assignment) continue;
    rows.push({
      id: `canvas-exam-${courseId}-a${a.id}`,
      label: title,
      due_at: a.due_at || null,
      kind: a.is_quiz_assignment ? "quiz" : "assignment",
      points: a.points_possible ?? null,
      inferred: true,
    });
  }
  for (const q of quizzes) {
    const title = String(q?.title || "");
    const type = String(q?.quiz_type || "");
    if (!EXAM_TITLE_RE.test(title) && type !== "assignment") continue;
    if (rows.some((r) => r.label === title && r.due_at === (q.due_at || null))) continue;
    rows.push({
      id: `canvas-exam-${courseId}-q${q.id}`,
      label: title,
      due_at: q.due_at || null,
      kind: "quiz",
      points: q.points_possible ?? null,
      inferred: true,
    });
  }
  return rows;
}

/**
 * Schema 2 (2026-09-18): adds `items` (every graded item with kind, points,
 * group weight and computed `weight_share`), `grading`, `term` (Canvas or
 * inferred, labeled) and `course.color` for the Home semester line. Schema 1
 * readers (the Python study core) keep working: `course`, `sources`, `exams`
 * are unchanged.
 */
export const STUDY_SOURCES_SCHEMA = 2;

export function courseRecord({ course, syllabus, pages, assignments, quizzes, groups = [], fetchedAt, errors = [], truncated = false, colorIndex = null }) {
  const sources = [];
  const syl = syllabusSource({ ...course, syllabus_body: syllabus ?? course.syllabus_body });
  if (syl) sources.push(syl);
  for (const p of pages || []) {
    const s = pageSource(course.id, p);
    if (s) sources.push(s);
  }
  for (const a of assignments || []) {
    const s = assignmentSource(course.id, a);
    if (s) sources.push(s);
  }
  const { items, grading } = buildItems(course.id, assignments, quizzes, groups);
  const idx = colorIndex ?? courseColorIndex(course.id);
  const swatch = COURSE_PALETTE[idx];
  return {
    schema: STUDY_SOURCES_SCHEMA,
    course: {
      id: String(course.id),
      name: String(course.name || ""),
      code: String(course.course_code || ""),
      label: courseLabel(course),
      color_index: idx,
      color: { name: swatch.name, light: swatch.light, dark: swatch.dark },
    },
    term: inferTerm(course, items),
    fetched_at: fetchedAt,
    sources,
    exams: examCandidates(course.id, assignments, quizzes),
    items,
    grading,
    truncated,
    errors,
  };
}
