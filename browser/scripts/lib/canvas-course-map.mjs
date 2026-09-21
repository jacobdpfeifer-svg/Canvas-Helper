/**
 * Stable course map: Start here / Learn / Do / Check. Fallback when modules fail.
 */
import { isHttpUrl } from "./canvas-model.mjs";
import { courseColor, courseLabel } from "./study-sources.mjs";

function publishedModules(modules) {
  return (modules || []).filter((m) => m && m.published !== false);
}

function flattenItems(modules) {
  const rows = [];
  const ordered = [...(modules || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
  for (const mod of ordered) {
    const items = [...(mod.items || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
    for (const it of items) {
      rows.push({
        id: String(it.id),
        module_id: String(mod.id),
        module_name: mod.name,
        title: it.title,
        type: it.type,
        html_url: isHttpUrl(it.html_url) ? it.html_url : null,
        published: it.published !== false && mod.published !== false,
        locked: Boolean(it.locked || it.content_details?.locked),
        indent: it.indent || 0,
        completion_requirement: it.completion_requirement || null,
        content_id: it.content_id != null ? String(it.content_id) : null,
        lti: it.type === "ExternalTool" || it.type === "ExternalUrl",
        launch_out: it.type === "ExternalTool" || it.type === "ExternalUrl",
      });
    }
  }
  return rows;
}

export function normalize_course_map(pack, { workItems = [], health, gradeTruth, sync_id } = {}) {
  const course = pack.course || {};
  const modules = pack.modules || [];
  const pub = publishedModules(modules);
  const empty = !pub.length || pub.every((m) => !(m.items || []).length);
  const unpublishedOnly = modules.length && !pub.length;
  let fallback_reason = null;
  if (empty) {
    fallback_reason = unpublishedOnly
      ? "No published modules found; organized from assignments and syllabus."
      : "No published modules found; organized from assignments and syllabus.";
  }
  const learn = empty ? [] : flattenItems(modules);
  const pages = pack.pages || [];
  const front = pages.find((p) => p.front_page) || pages[0] || null;
  const firstActionable = learn.find((it) => it.published && !it.locked) || null;
  const syllabusUrl = course.html_url ? `${String(course.html_url).replace(/\/$/, "")}/assignments/syllabus` : null;
  const start_here = [
    course.syllabus_body
      ? { kind: "syllabus", title: "Syllabus", html_url: isHttpUrl(syllabusUrl) ? syllabusUrl : null, freshness: pack.fetched_at || health?.as_of }
      : null,
    front
      ? { kind: "page", title: front.title || "Home page", html_url: isHttpUrl(front.html_url) ? front.html_url : null, freshness: front.updated_at || health?.as_of }
      : null,
    firstActionable
      ? { kind: "module_item", title: firstActionable.title, html_url: firstActionable.html_url, freshness: health?.as_of }
      : null,
  ].filter(Boolean);

  const cid = String(course.id);
  const doItems = workItems.filter((w) => w.course_id === cid && w.actionable !== false && w.submission_state !== "suppressed");
  const check = {
    missing: doItems.filter((w) => w.submission_state === "missing" || (w.submission_state === "unsubmitted" && w.effective_due_at && Date.parse(w.effective_due_at) < Date.now())),
    unsubmitted: doItems.filter((w) => w.submission_state === "unsubmitted"),
    grade: gradeTruth || null,
    sync_warnings: health?.failed_endpoints || [],
  };

  return {
    sync_id,
    health_state: health?.state,
    as_of: health?.as_of,
    course: {
      id: cid,
      code: course.course_code || "",
      name: course.name || "",
      label: courseLabel(course),
      color: courseColor(course.id),
      html_url: isHttpUrl(course.html_url) ? course.html_url : null,
    },
    fallback_reason,
    start_here,
    learn,
    do: doItems,
    check,
  };
}
