/**
 * The only way this extension talks to Canvas: GET, with the student's own
 * session, to a fixed list of read endpoints.
 *
 * There is deliberately no method parameter and the CSRF token is never read,
 * so no code path here can create, submit, post, or edit anything in Canvas
 * (docs/handoff/canvas-focus-pivot-2026-09-11.md,
 * docs/handoff/freshness-extension-spike-2026-09-29.md).
 */

export const SUMMARY_PATH = "/api/v1/users/self/activity_stream/summary";

const ALLOWED_PATHS = [
  /^\/api\/v1\/users\/self\/activity_stream\/summary$/,
  /^\/api\/v1\/users\/self\/activity_stream$/,
  /^\/api\/v1\/planner\/items$/,
  /^\/api\/v1\/courses\/\d+\/assignments\/\d+$/,
];

const ALLOWED_HOSTS = [/^canvas\.colorado\.edu$/, /^[a-z0-9-]+\.instructure\.com$/];

export function isAllowedBase(base) {
  try {
    const u = new URL(base);
    return u.protocol === "https:" && u.pathname === "/" && !u.search && ALLOWED_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

/** Path (with optional query) → true only for the read endpoints above. */
export function isAllowedPath(pathWithQuery) {
  if (typeof pathWithQuery !== "string" || !pathWithQuery.startsWith("/")) return false;
  const [pathname] = pathWithQuery.split("?");
  if (pathname.includes("..") || pathname.includes("//")) return false;
  return ALLOWED_PATHS.some((re) => re.test(pathname));
}

/**
 * @param {string} base e.g. "https://canvas.colorado.edu/"
 * @param {string} pathWithQuery an allow-listed read path
 * @returns {Promise<{ ok: boolean, status: number, json: any }>}
 */
export async function canvasGet(base, pathWithQuery, { fetchImpl = fetch } = {}) {
  if (!isAllowedBase(base)) throw new Error("canvasGet: base not allowed");
  if (!isAllowedPath(pathWithQuery)) throw new Error("canvasGet: path not allowed");
  const url = new URL(pathWithQuery, base).toString();
  let res;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      redirect: "follow",
    });
  } catch {
    return { ok: false, status: 0, json: null };
  }
  let json = null;
  try {
    json = JSON.parse((await res.text()).replace(/^while\(1\);/, ""));
  } catch {
    json = null;
  }
  return { ok: res.status >= 200 && res.status < 300, status: res.status, json };
}

const clip = (value, max) => (typeof value === "string" && value.length > max ? value.slice(0, max) : value);

/** Keep only the stream fields the classifier reads (smaller payload, less personal data). */
export function trimStreamItem(item) {
  const comments = Array.isArray(item?.submission_comments) ? item.submission_comments.slice(-3) : undefined;
  return {
    type: item?.type,
    id: item?.id,
    announcement_id: item?.announcement_id,
    title: clip(item?.title, 300),
    message: clip(item?.message, 4000),
    course_id: item?.course_id,
    created_at: item?.created_at,
    updated_at: item?.updated_at,
    html_url: item?.html_url,
    notification_category: item?.notification_category,
    workflow_state: item?.workflow_state,
    score: item?.score,
    grade: item?.grade,
    graded_at: item?.graded_at,
    assignment_id: item?.assignment_id,
    assignment: item?.assignment ? { id: item.assignment.id, name: clip(item.assignment.name, 300), points_possible: item.assignment.points_possible } : undefined,
    submission_comments: comments?.map((c) => ({ id: c.id, created_at: c.created_at, comment: clip(c.comment, 500) })),
  };
}

export function trimPlannerItem(p) {
  return {
    plannable_type: p?.plannable_type,
    plannable_id: p?.plannable_id,
    course_id: p?.course_id,
    context_name: clip(p?.context_name, 200),
    html_url: p?.html_url,
    plannable_date: p?.plannable_date,
    new_activity: p?.new_activity,
    plannable: p?.plannable
      ? {
          title: clip(p.plannable.title, 300),
          due_at: p.plannable.due_at,
          created_at: p.plannable.created_at,
          points_possible: p.plannable.points_possible,
        }
      : undefined,
  };
}
