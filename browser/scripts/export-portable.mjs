/**
 * Student-operated portable Canvas export.
 *
 * Reads the canonical, atomically committed Canvas generation and writes a
 * self-contained Markdown/JSON bundle plus a ZIP under inbox/export/. Grades
 * are deliberately opt-in: set EXPORT_INCLUDE_GRADES=1 to include them.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { resolveUserRoot } from "./lib/user-root.mjs";
import { pathsFor, readCurrentProjections, readCurrentRaw } from "./lib/canvas-store.mjs";

const userRoot = resolveUserRoot({ create: true, announce: false });
const paths = pathsFor(userRoot);
const includeGrades = process.env.EXPORT_INCLUDE_GRADES === "1";
const generatedAt = new Date().toISOString();

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function safeName(value, fallback = "course") {
  const clean = String(value || fallback).replace(/[^\w.-]+/g, "_").replace(/^\.+/, "");
  return clean.slice(0, 100) || fallback;
}

function httpUrl(value) {
  try {
    const u = new URL(String(value || ""));
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch { return null; }
}

function quality(health) {
  const state = String(health?.state || "unavailable");
  if (state === "blocked" || state === "empty_unverified" || state === "unavailable") return { status: "unavailable", state };
  if (state.includes("stale")) return { status: "stale", state };
  if (state.includes("partial")) return { status: "partial", state };
  return { status: "complete", state };
}

function sourceMeta({ id, endpoint, url, updatedAt, fetchedAt, availability = "available", limitation = null }) {
  return {
    source_id: String(id),
    source_endpoint: endpoint || null,
    canvas_url: httpUrl(url),
    updated_at: updatedAt || null,
    fetched_at: fetchedAt || null,
    availability,
    limitation,
  };
}

function submissionState(assignment, submissions) {
  const id = String(assignment?.id ?? "");
  const row = (submissions || []).find((s) => String(s.assignment_id ?? s.id ?? "") === id) || assignment?.submission;
  const workflow = String(row?.workflow_state || "").toLowerCase();
  if (row?.missing || workflow === "missing") return "missing";
  if (workflow === "graded" || row?.score != null && row?.graded_at) return "graded";
  if (workflow === "pending_review") return "pending_review";
  if (row?.late) return "late";
  if (row?.submitted_at || workflow === "submitted") return "submitted";
  return "unsubmitted";
}

function externalInfo(item) {
  const type = String(item?.type || "").toLowerCase();
  const external = type === "externaltool" || type === "externalurl" || type === "external_tool" || type === "external_url";
  return external ? {
    availability: "unavailable",
    limitation: "External/LTI content is linked for the student to open in Canvas; it was not copied into this export.",
  } : { availability: "available", limitation: null };
}

function assignmentView(a, pack, fetchedAt, qualityInfo) {
  const external = (a.submission_types || []).some((t) => /external_tool|external_url/i.test(String(t)))
    ? { availability: "unavailable", limitation: "This assignment may require an external or Canvas submission tool; use Canvas for the authoritative workflow." }
    : { availability: qualityInfo.status, limitation: qualityInfo.status === "partial" ? "This record came from a partial sync; verify it in Canvas." : null };
  return {
    source: sourceMeta({ id: `assignment:${a.id}`, endpoint: `/api/v1/courses/${pack.course.id}/assignments/${a.id}`, url: a.html_url, updatedAt: a.updated_at, fetchedAt, availability: external.availability, limitation: external.limitation }),
    title: a.name || "Assignment",
    kind: a.is_quiz_assignment ? "quiz" : "assignment",
    due_at: a.effective_due_at || a.due_at || null,
    points_possible: a.points_possible ?? null,
    submission_state: submissionState(a, pack.submissions),
    description: a.description || "",
    submission_types: Array.isArray(a.submission_types) ? a.submission_types : [],
    assignment_group_id: a.assignment_group_id == null ? null : String(a.assignment_group_id),
  };
}

function moduleView(module, pack, fetchedAt, qualityInfo) {
  const items = [...(module.items || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
  return {
    source: sourceMeta({ id: `module:${module.id}`, endpoint: `/api/v1/courses/${pack.course.id}/modules/${module.id}`, url: module.html_url, updatedAt: module.updated_at, fetchedAt, availability: qualityInfo.status, limitation: qualityInfo.status === "partial" ? "Module contents may be incomplete; verify the module in Canvas." : null }),
    title: module.name || "Module",
    position: module.position ?? null,
    published: module.published !== false,
    items: items.map((item) => {
      const ext = externalInfo(item);
      return {
        source: sourceMeta({ id: `module-item:${item.id}`, endpoint: `/api/v1/courses/${pack.course.id}/modules/${module.id}/items/${item.id}`, url: item.html_url, updatedAt: item.updated_at, fetchedAt, availability: ext.availability === "unavailable" ? "unavailable" : qualityInfo.status, limitation: ext.limitation }),
        title: item.title || "Module item",
        type: item.type || "unknown",
        position: item.position ?? null,
        html_url: httpUrl(item.html_url),
        content_id: item.content_id == null ? null : String(item.content_id),
        external: ext.availability === "unavailable",
        limitation: ext.limitation,
      };
    }),
  };
}

function courseView(pack, health, gradeTruth) {
  const c = pack.course || {};
  const fetchedAt = pack.fetched_at || health?.as_of || null;
  const qualityInfo = quality(health);
  const modules = [...(pack.modules || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
  const assignments = (pack.assignments || []).map((a) => assignmentView(a, pack, fetchedAt, qualityInfo));
  const moduleAssignmentIds = new Set(modules.flatMap((m) => (m.items || []).filter((i) => /assignment|quiz|discussion/i.test(String(i.type))).map((i) => String(i.content_id))));
  const pages = (pack.pages || []).map((p) => ({
    source: sourceMeta({ id: `page:${p.page_id || p.url}`, endpoint: `/api/v1/courses/${c.id}/pages/${p.url || p.page_id}`, url: p.html_url, updatedAt: p.updated_at, fetchedAt, availability: qualityInfo.status }),
    title: p.title || p.url || "Page",
    text: p.body || "",
  }));
  const out = {
    source: sourceMeta({ id: `course:${c.id}`, endpoint: `/api/v1/courses/${c.id}`, url: c.html_url, updatedAt: c.updated_at, fetchedAt, availability: qualityInfo.status, limitation: qualityInfo.status === "partial" ? "Some Canvas endpoints were incomplete during this sync." : null }),
    course: { id: String(c.id), code: c.course_code || "", name: c.name || "", canvas_url: httpUrl(c.html_url) },
    data_quality: { ...qualityInfo, sync_id: health?.sync_id || null, as_of: health?.as_of || fetchedAt, failed_endpoints: health?.failed_endpoints || [], truncated: health?.truncated || [], labels: { complete: "Fetched successfully from the canonical Canvas snapshot.", partial: "Some requested Canvas data was missing or truncated; verify in Canvas.", stale: "The snapshot is older than the freshness threshold; verify current details in Canvas.", inferred: "Derived from available Canvas signals rather than explicitly confirmed by Canvas.", unavailable: "Not available in the snapshot or intentionally left in Canvas, such as external/LTI content." } },
    syllabus: c.syllabus_body ? { source: sourceMeta({ id: `syllabus:${c.id}`, endpoint: `/api/v1/courses/${c.id}`, url: c.html_url ? `${c.html_url}/assignments/syllabus` : null, updatedAt: c.updated_at, fetchedAt, availability: qualityInfo.status }), text: c.syllabus_body } : { status: "unavailable", reason: "No syllabus text was published in Canvas." },
    modules: modules.map((m) => moduleView(m, pack, fetchedAt, qualityInfo)),
    assignments: assignments.filter((a) => !moduleAssignmentIds.has(String(a.source.source_id).replace("assignment:", ""))),
    resources: pages,
  };
  if (includeGrades) out.grades = gradeTruth || { status: "unavailable", reason: "No grade projection was available." };
  return out;
}

function markdownCourse(course) {
  const lines = [`# ${course.course.name || course.course.code}`, "", `- Canvas URL: ${course.course.canvas_url || "unavailable"}`, `- Source ID: ${course.source.source_id}`, `- Sync: ${course.data_quality.sync_id || "unknown"}`, `- Data status: ${course.data_quality.status} (${course.data_quality.state})`, `- Fetched: ${course.source.fetched_at || "unknown"}`, ""];
  lines.push("## How to read this export", "", "Source IDs, URLs, timestamps, and availability labels are preserved so an agent can distinguish published content from inferred or unavailable content.", "");
  if (course.syllabus?.text) lines.push("## Syllabus", "", course.syllabus.text, "");
  lines.push("## Modules (Canvas order)", "");
  if (!course.modules.length) lines.push("No published modules were available. Assignments and pages are listed below.", "");
  for (const mod of course.modules) {
    lines.push(`### ${mod.title}`, "", `Status: ${mod.source.availability} · Source ID: ${mod.source.source_id}`, "");
    for (const item of mod.items) lines.push(`- ${item.title} (${item.type}) — ${item.source.availability}${item.html_url ? ` — ${item.html_url}` : ""}${item.limitation ? ` — ${item.limitation}` : ""}`);
    lines.push("");
  }
  lines.push("## Assignments", "");
  for (const a of course.assignments) {
    lines.push(`### ${a.title}`, "", `- Due: ${a.due_at || "no date"}`, `- Submission state: ${a.submission_state}`, `- Status: ${a.source.availability}`, `- Source ID: ${a.source.source_id}`, ...(a.source.canvas_url ? [`- Canvas URL: ${a.source.canvas_url}`] : []), "", a.description || "(no description)", "");
  }
  if (course.resources.length) {
    lines.push("## Pages and readings", "");
    for (const p of course.resources) lines.push(`### ${p.title}`, "", `Source ID: ${p.source.source_id}`, p.text, "");
  }
  if (course.grades) lines.push("## Grades (included by explicit request)", "", "This section is present because the student opted in to grades.", "", "```json", JSON.stringify(course.grades, null, 2), "```", "");
  return lines.join("\n");
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const local = [], central = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBuf = Buffer.from(name);
    const raw = Buffer.isBuffer(text) ? text : Buffer.from(text);
    const compressed = zlib.deflateRawSync(raw, { level: 6 });
    const head = Buffer.alloc(30 + nameBuf.length);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(8, 6); head.writeUInt16LE(8, 8); head.writeUInt32LE(crc32(raw), 14); head.writeUInt32LE(compressed.length, 18); head.writeUInt32LE(raw.length, 22); head.writeUInt16LE(nameBuf.length, 26); nameBuf.copy(head, 30);
    local.push(head, compressed);
    const dir = Buffer.alloc(46 + nameBuf.length);
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(8, 8); dir.writeUInt16LE(8, 10); dir.writeUInt32LE(crc32(raw), 16); dir.writeUInt32LE(compressed.length, 20); dir.writeUInt32LE(raw.length, 24); dir.writeUInt16LE(nameBuf.length, 28); dir.writeUInt32LE(offset, 42); nameBuf.copy(dir, 46);
    central.push(dir); offset += head.length + compressed.length;
  }
  const centralBuf = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length, 8); end.writeUInt16LE(central.length, 10); end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuf, end]);
}

function pdfFromText(text) {
  // Dependency-free convenience PDF. Markdown and JSON remain authoritative.
  const clean = String(text).replace(/[`*_#]/g, "").replace(/\r/g, "");
  const lines = [];
  for (const paragraph of clean.split("\n")) {
    const value = paragraph.trimEnd();
    if (!value) { lines.push(""); continue; }
    for (let i = 0; i < value.length; i += 105) lines.push(value.slice(i, i + 105));
  }
  const pages = [];
  for (let i = 0; i < lines.length; i += 54) pages.push(lines.slice(i, i + 54));
  if (!pages.length) pages.push(["Canvas data export"]);
  const objects = [];
  const add = (value) => { objects.push(value); return objects.length; };
  const catalog = add(null); const pagesObj = add(null); const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageRefs = [];
  for (const page of pages) {
    const content = ["BT", "/F1 9 Tf", "12 TL", "40 752 Td", ...page.map((line) => `(${line.replace(/\\/g, "\\\\").replace(/[()]/g, "\\$&")}) Tj T*`), "ET"].join("\n");
    const contentRef = add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    pageRefs.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${contentRef} 0 R >>`));
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageRefs.map((r) => `${r} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;
  let output = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(output)); output += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(output); output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output);
}

function main() {
  const current = readCurrentRaw(userRoot);
  if (!current) throw new Error("No canonical Canvas snapshot found. Sync Canvas first.");
  const projectionPointer = readCurrentProjections(userRoot);
  const health = projectionPointer ? readJson(path.join(projectionPointer.dir, "sync-health.json"), {}) : {};
  const generation = current.generation;
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const exportDir = path.join(userRoot, "inbox", "export", `canvas-${stamp}`);
  fs.mkdirSync(path.join(exportDir, "courses"), { recursive: true });
  const courses = [];
  const files = {};
  for (const pack of generation.courses || []) {
    const id = String(pack.course?.id);
    const grade = includeGrades && projectionPointer ? readJson(path.join(projectionPointer.dir, "grade-truth", `${id}.json`), null) : null;
    const view = courseView(pack, health, grade);
    const slug = safeName(pack.course?.course_code || pack.course?.name || id, id);
    const jsonPath = `courses/${slug}/course.json`;
    const mdPath = `courses/${slug}/course.md`;
    files[jsonPath] = JSON.stringify(view, null, 2);
    files[mdPath] = markdownCourse(view);
    courses.push({ id, code: pack.course?.course_code || null, name: pack.course?.name || null, status: view.data_quality.status, json: jsonPath, markdown: mdPath });
  }
  const manifest = { schema: 1, generated_at: generatedAt, sync_id: generation.manifest?.sync_id || current.pointer?.sync_id || null, sync_finished_at: generation.manifest?.finished_at || null, grades_included: includeGrades, data_status: quality(health), courses };
  files["manifest.json"] = JSON.stringify(manifest, null, 2);
  files["README.md"] = `# Canvas data export\n\nGenerated: ${generatedAt}\nSync: ${manifest.sync_id || "unknown"}\nData status: ${manifest.data_status.status}\nGrades included: ${includeGrades ? "yes (student opted in)" : "no"}\n\n## Using this with NotebookLM or another agent\n\nUpload the Markdown files in \`courses/\` as sources. Upload \`manifest.json\` when you want the tool to understand course IDs, sync time, provenance, and data-quality labels. The Markdown preserves Canvas module order and labels content as complete, partial, stale, inferred, or unavailable.\n\nExternal/LTI/proctored items are represented as links and limitations; open those in Canvas. Submission state is limited to workflow status and does not include comments, answers, or submission files. This is a point-in-time export, not a live connection.\n`;
  files["canvas-overview.pdf"] = pdfFromText(Object.entries(files).filter(([name]) => name.endsWith(".md")).map(([, body]) => body).join("\n\n"));
  for (const [name, text] of Object.entries(files)) { const file = path.join(exportDir, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
  const zipPath = path.join(userRoot, "inbox", "export", `${path.basename(exportDir)}.zip`);
  fs.writeFileSync(zipPath, zipStore(files));
  console.log(JSON.stringify({ ok: true, export_dir: exportDir, zip: zipPath, courses: courses.length, grades_included: includeGrades }, null, 2));
}

main();
