/**
 * Discover WeVideo/PlayPosit external_tool assignments from Canvas API + inbox catalogs.
 */
import fs from "node:fs";
import path from "node:path";
import {
  COURSES_DIR,
  WEEK_PATH,
  resolveCourseCode,
} from "../canvas-session.mjs";
import { WEVIDEO_COURSE_IDS, isWeVideoToolAttrs, isWeVideoUrl } from "./urls.mjs";

async function apiGet(page, apiPath) {
  return page.evaluate(async (p) => {
    const r = await fetch(p, { credentials: "include" });
    const text = await r.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    return { ok: r.ok, status: r.status, json, text: text.slice(0, 2000) };
  }, apiPath);
}

export async function listCourseAssignments(page, courseId) {
  const all = [];
  let pageNum = 1;
  for (;;) {
    const res = await apiGet(
      page,
      `/api/v1/courses/${courseId}/assignments?per_page=50&page=${pageNum}&include[]=external_tool_tag_attributes&include[]=submission`
    );
    if (!res.ok || !Array.isArray(res.json)) break;
    all.push(...res.json);
    if (res.json.length < 50) break;
    pageNum += 1;
    if (pageNum > 30) break;
  }
  return all;
}

export function normalizeAssignment(a, courseCode) {
  const attrs = a.external_tool_tag_attributes || null;
  const toolUrl = attrs?.url || null;
  const wevideo = isWeVideoToolAttrs(attrs) || isWeVideoUrl(toolUrl);
  const sub = a.submission || {};
  const done =
    sub.workflow_state === "graded" ||
    sub.workflow_state === "submitted" ||
    sub.workflow_state === "pending_review" ||
    Number(sub.score) > 0;
  return {
    courseCode,
    courseId: a.course_id || WEVIDEO_COURSE_IDS[courseCode] || null,
    id: a.id,
    name: a.name,
    url: a.html_url,
    points: a.points_possible,
    submission_types: a.submission_types || [],
    external_tool_tag_attributes: attrs,
    toolUrl,
    newTab: Boolean(attrs?.new_tab),
    isWeVideo: wevideo,
    submissionState: sub.workflow_state || null,
    apparentlyDone: done,
  };
}

export async function discoverWeVideoForCourse(page, courseCode, { allOpen = false } = {}) {
  const courseId = WEVIDEO_COURSE_IDS[courseCode];
  if (!courseId) {
    throw new Error(
      `Unknown course code ${courseCode}. Known: ${Object.keys(WEVIDEO_COURSE_IDS).join(", ")}`
    );
  }
  const raw = await listCourseAssignments(page, courseId);
  let items = raw
    .filter((a) => (a.submission_types || []).includes("external_tool"))
    .map((a) => normalizeAssignment(a, courseCode))
    .filter((a) => a.isWeVideo);

  if (!allOpen) {
    items = items.filter((a) => !a.apparentlyDone);
  }
  return items;
}

/** Parse week.md url cells for PlayPosit/WeVideo-ish rows. */
export function discoverFromWeekMd() {
  if (!fs.existsSync(WEEK_PATH)) return [];
  const text = fs.readFileSync(WEEK_PATH, "utf8");
  const out = [];
  for (const line of text.split("\n")) {
    if (!/playposit|wevideo/i.test(line)) continue;
    const urlM = line.match(/url:(https:\/\/canvas\.colorado\.edu\/courses\/\d+\/assignments\/\d+)/i);
    if (!urlM) continue;
    const cells = line.split("|").map((c) => c.trim());
    const course = cells[1] || "";
    const name = cells[2] || "";
    out.push({
      courseCode: resolveCourseCode(course, "") || resolveCourseCode(name, ""),
      name,
      url: urlM[1],
      isWeVideo: true,
      source: "week.md",
    });
  }
  return out;
}

/** Catalog rows marked external_tool + PlayPosit/WeVideo in name. */
export function discoverFromCourseMd(courseCode) {
  const file = path.join(COURSES_DIR, `${courseCode}.md`);
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8");
  const out = [];
  for (const line of text.split("\n")) {
    if (!/external_tool/i.test(line)) continue;
    if (!/playposit|wevideo|section \d|welcome and introduction/i.test(line) && courseCode === "BCOR1030") {
      if (!/playposit|wevideo/i.test(line)) continue;
    }
    if (courseCode === "ONLINEEXP" && !/external_tool/i.test(line)) continue;
    if (courseCode === "ONLINEEXP" && /advising challenge|degree requirements$/i.test(line) && /quiz/i.test(line)) {
      continue;
    }
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 5) continue;
    const name = cells[1];
    if (!name || name === "Name") continue;
    const isLti = /external_tool|lti/i.test(line);
    if (!isLti) continue;
    const looksWeVideo =
      /playposit|wevideo/i.test(name) ||
      courseCode === "ONLINEEXP" ||
      courseCode === "LEEDSFYE";
    if (!looksWeVideo) continue;
    out.push({
      courseCode,
      name,
      url: null,
      isWeVideo: true,
      source: `${courseCode}.md`,
      status: cells[5] || "",
    });
  }
  return out;
}

export async function resolveTargets(page, opts) {
  const {
    assignmentUrl = null,
    course = null,
    allOpen = false,
  } = opts;

  if (assignmentUrl) {
    const m = assignmentUrl.match(/courses\/(\d+)\/assignments\/(\d+)/);
    if (!m) throw new Error(`Bad assignment URL: ${assignmentUrl}`);
    const courseId = Number(m[1]);
    const assignmentId = Number(m[2]);
    const res = await apiGet(
      page,
      `/api/v1/courses/${courseId}/assignments/${assignmentId}?include[]=external_tool_tag_attributes&include[]=submission`
    );
    if (!res.ok || !res.json) {
      throw new Error(`Assignment fetch failed (${res.status})`);
    }
    const code =
      Object.entries(WEVIDEO_COURSE_IDS).find(([, id]) => id === courseId)?.[0] ||
      `COURSE${courseId}`;
    const item = normalizeAssignment(res.json, code);
    if (!item.isWeVideo) {
      return { skipped: [item], targets: [] };
    }
    return { skipped: [], targets: [item] };
  }

  if (course) {
    const targets = await discoverWeVideoForCourse(page, course.toUpperCase(), {
      allOpen,
    });
    return { skipped: [], targets };
  }

  // Default: all known WeVideo courses, incomplete only
  const targets = [];
  for (const code of Object.keys(WEVIDEO_COURSE_IDS)) {
    const items = await discoverWeVideoForCourse(page, code, { allOpen });
    targets.push(...items);
  }
  return { skipped: [], targets };
}
