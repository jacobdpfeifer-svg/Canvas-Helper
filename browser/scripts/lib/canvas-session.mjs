/**
 * Shared CU Canvas SSO session helpers.
 *
 * Truth path: session cookies → same /api/v1 REST as a PAT would use.
 * Playwright is auth + transport, not a second product.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const BASE = "https://canvas.colorado.edu";
export const ROOT = path.join(__dirname, "..", "..", "..");
export const AUTH_DIR = path.join(__dirname, "..", "..", ".auth");
export const INBOX_DIR = path.join(ROOT, "inbox");
export const WEEK_PATH = path.join(INBOX_DIR, "week.md");

export function clearSingletonLocks(authDir = AUTH_DIR) {
  for (const name of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
    try {
      fs.unlinkSync(path.join(authDir, name));
    } catch {
      /* absent is fine */
    }
  }
}

export async function launchCanvasContext(options = {}) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  clearSingletonLocks();
  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    ...options,
  });
  const page = context.pages()[0] || (await context.newPage());
  return { context, page };
}

export async function requireLoggedIn(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const onLogin =
    page.url().includes("login") ||
    (await page.locator("text=IdentiKey").count()) > 0 ||
    (await page.locator('input[name="username"], #username').count()) > 0;
  if (onLogin) {
    throw new Error(
      "Not logged in. Run: cd browser && npm run open-canvas — complete IdentiKey/MFA, then retry."
    );
  }
}

/** Session-authenticated Canvas REST (cookies, not developer PAT). */
export async function api(page, pathAndQuery) {
  return page.evaluate(async (pq) => {
    const res = await fetch(pq, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text.slice(0, 500);
    }
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      json,
    };
  }, pathAndQuery);
}

export async function apiAllPages(page, pathBase, params = {}) {
  const items = [];
  let pageNum = 1;
  for (;;) {
    const qs = new URLSearchParams({
      ...params,
      per_page: "50",
      page: String(pageNum),
    });
    const sep = pathBase.includes("?") ? "&" : "?";
    const r = await api(page, `${pathBase}${sep}${qs}`);
    if (!r.ok) return { ok: false, status: r.status, items, error: r.json };
    const batch = Array.isArray(r.json) ? r.json : [];
    items.push(...batch);
    if (batch.length < 50) return { ok: true, items };
    pageNum += 1;
    if (pageNum > 20) return { ok: true, items, truncated: true };
  }
}

export function escCell(s) {
  return String(s ?? "")
    .replace(/\|/g, "/")
    .replace(/\n/g, " ")
    .trim();
}

export function keyOf(course, title, due) {
  return `${(course || "").toLowerCase()}||${(title || "").toLowerCase()}||${(due || "").slice(0, 10)}`;
}

export function isoDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** Heuristic: work that usually needs Browser UI + Jacob, not Canvas REST submit. */
export function classifyExternalHint(title, type) {
  const blob = `${title || ""} ${type || ""}`.toLowerCase();
  if (
    /webassign|zybooks|playposit|play posit|proctor|lockdown|respondus|honorlock|proctored/.test(
      blob
    )
  ) {
    return "external/LTI — browser+Jacob; never auto";
  }
  if (/\bquiz\b|exam|midterm|final/.test(blob)) {
    return "assessment — Jacob only";
  }
  return "";
}

export function fromPlanner(items) {
  const rows = [];
  for (const item of items || []) {
    const p = item.plannable || {};
    rows.push({
      source: "planner",
      course: item.context_name || item.course_name || item.context_code || "",
      title: p.title || p.name || item.plannable_type || "Untitled",
      due: item.plannable_date || p.due_at || p.todo_date || "",
      points: p.points_possible ?? "",
      type: item.plannable_type || "",
      html_url: item.html_url || p.html_url || "",
      complete: !!(
        item.planner_override?.marked_complete || item.submissions?.submitted
      ),
      course_id:
        item.course_id ||
        (String(item.context_code || "").match(/course_(\d+)/) || [])[1],
    });
  }
  return rows;
}

export function fromTodo(items) {
  const rows = [];
  for (const t of items || []) {
    const a = t.assignment || {};
    rows.push({
      source: "todo",
      course: t.context_name || a.course_id || "",
      title: a.name || t.type || "Todo",
      due: a.due_at || "",
      points: a.points_possible ?? "",
      type: t.type || "todo",
      html_url: a.html_url || "",
      complete: false,
      course_id: a.course_id,
    });
  }
  return rows;
}

export function fromAssignments(courseName, courseId, assignments) {
  const rows = [];
  for (const a of assignments || []) {
    rows.push({
      source: "course_assignments",
      course: courseName,
      title: a.name || "Assignment",
      due: a.due_at || a.lock_at || "",
      points: a.points_possible ?? "",
      type:
        (a.is_quiz_assignment && "quiz") ||
        (a.submission_types || []).join(",") ||
        "assignment",
      html_url: a.html_url || "",
      complete: !!(a.submission && a.submission.submitted_at),
      course_id: courseId,
    });
  }
  return rows;
}

export function dedupeRows(rows) {
  const byKey = new Map();
  for (const r of rows) {
    const k = keyOf(r.course, r.title, r.due);
    const prev = byKey.get(k);
    if (!prev) byKey.set(k, { ...r, sources: [r.source] });
    else if (!prev.sources.includes(r.source)) prev.sources.push(r.source);
  }
  return [...byKey.values()].sort((a, b) =>
    String(a.due).localeCompare(String(b.due))
  );
}

/**
 * Fetch the canonical due-work universe via SSO session → /api/v1.
 * Prefer this over DOM scraping.
 */
export async function fetchDueUniverse(page, { daysAhead = 14 } = {}) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(Date.now() + daysAhead * 86400000);
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const health = {};

  const coursesRes = await apiAllPages(page, "/api/v1/courses", {
    enrollment_state: "active",
  });
  health.courses = {
    ok: coursesRes.ok,
    count: coursesRes.items?.length ?? 0,
  };
  const courses = coursesRes.ok ? coursesRes.items : [];

  const plannerRes = await apiAllPages(page, "/api/v1/planner/items", {
    start_date: startIso,
    end_date: endIso,
  });
  health.planner = {
    ok: plannerRes.ok,
    count: plannerRes.items?.length ?? 0,
  };

  const todoRes = await api(page, "/api/v1/users/self/todo?per_page=50");
  const todoItems =
    todoRes.ok && Array.isArray(todoRes.json) ? todoRes.json : [];
  health.todo = { ok: todoRes.ok, count: todoItems.length, status: todoRes.status };

  const allRows = [
    ...fromPlanner(plannerRes.items),
    ...fromTodo(todoItems),
  ];

  for (const c of courses) {
    const id = c.id;
    const name = c.name || c.course_code || String(id);
    const aRes = await apiAllPages(page, `/api/v1/courses/${id}/assignments`, {
      order_by: "due_at",
      include: "submission",
    });
    if (aRes.ok) allRows.push(...fromAssignments(name, id, aRes.items || []));
  }

  const universe = dedupeRows(allRows);
  return { courses, universe, health, start, end };
}
