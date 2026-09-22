/**
 * Manual, student-operated export: package the current sync's per-course
 * study-sources (syllabus text, assignment descriptions, exam list) + grades
 * into a flat folder of Markdown + JSON the student can hand to another
 * agent (NotebookLM, ChatGPT, etc.) — not wired into `npm run sync`, and
 * never runs on its own.
 *
 *   cd browser && npm run export-bundle
 */
import fs from "node:fs";
import path from "node:path";
import { INBOX_DIR, GRADES_PATH, schoolLocalDay } from "./lib/canvas-session.mjs";

const STUDY_SOURCES_DIR = path.join(INBOX_DIR, "study-sources");
const EXPORT_DIR = path.join(INBOX_DIR, "export", "latest");
const SKIP_FILES = new Set(["progress.json", "status.json"]);

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function readYamlGrades() {
  // grades.yaml is machine-generated with a fixed, flat shape — avoid a YAML
  // dependency for this one read.
  const raw = fs.existsSync(GRADES_PATH) ? fs.readFileSync(GRADES_PATH, "utf8") : "";
  const byId = {};
  let current = null;
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*-\s*code:\s*"?(.*?)"?\s*$/);
    if (m) {
      current = { code: m[1] };
      continue;
    }
    if (!current) continue;
    let mm;
    if ((mm = line.match(/^\s*canvas_course_id:\s*(\d+)/))) {
      current.id = mm[1];
      byId[current.id] = current;
    } else if ((mm = line.match(/^\s*letter:\s*"(.*)"/))) {
      current.letter = mm[1];
    } else if ((mm = line.match(/^\s*percent:\s*(null|[\d.]+)/))) {
      current.percent = mm[1] === "null" ? null : Number(mm[1]);
    }
  }
  return byId;
}

function fmtDate(iso) {
  if (!iso) return "(no date)";
  return String(iso).replace("T", " ").slice(0, 16);
}

function courseMarkdown(record, grade) {
  const c = record.course || {};
  const lines = [];
  lines.push(`# ${c.name || c.code || c.id}`);
  lines.push("");
  lines.push(`- Canvas course code: \`${c.code || "?"}\``);
  if (grade) lines.push(`- Current grade: ${grade.letter || "(ungraded)"}${grade.percent != null ? ` (${grade.percent}%)` : ""}`);
  if (record.term?.start_at) lines.push(`- Term: ${fmtDate(record.term.start_at)} → ${fmtDate(record.term.end_at)}`);
  lines.push(`- Synced: ${record.fetched_at || "?"}${record.truncated ? " (partial — some sources truncated)" : ""}`);
  lines.push("");

  const syllabus = (record.sources || []).filter((s) => s.kind === "syllabus");
  if (syllabus.length) {
    lines.push("## Syllabus");
    lines.push("");
    for (const s of syllabus) {
      lines.push(s.text || "(no text)");
      lines.push("");
    }
  }

  const exams = record.exams || [];
  if (exams.length) {
    lines.push("## Likely exams / high-stakes dates");
    lines.push("");
    for (const e of exams) {
      lines.push(`- ${e.label || e.kind}${e.due_at ? ` — ${fmtDate(e.due_at)}` : " — date not yet posted"}${e.points ? ` (${e.points} pts)` : ""}${e.inferred ? " _(inferred from title, confirm in Canvas)_" : ""}`);
    }
    lines.push("");
  }

  const items = [...(record.items || [])].sort((a, b) => (a.due_at || "").localeCompare(b.due_at || ""));
  if (items.length) {
    lines.push("## Assignments");
    lines.push("");
    for (const it of items) {
      lines.push(`### ${it.title}`);
      lines.push("");
      lines.push(
        `- Due: ${fmtDate(it.due_at)} | Points: ${it.points_possible ?? "?"} | Type: ${it.kind}${it.completed ? " | **submitted/complete**" : ""}`
      );
      if (it.html_url) lines.push(`- Canvas link: ${it.html_url}`);
      lines.push("");
      if (it.description) {
        lines.push(it.description);
        lines.push("");
      }
    }
  }

  const other = (record.sources || []).filter((s) => s.kind !== "syllabus" && s.kind !== "assignment");
  if (other.length) {
    lines.push("## Other resources (pages, modules)");
    lines.push("");
    for (const s of other) {
      lines.push(`### ${s.title || s.kind}`);
      if (s.url) lines.push(`Link: ${s.url}`);
      lines.push("");
      if (s.text) {
        lines.push(s.text);
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(STUDY_SOURCES_DIR)) {
    console.error(`No study-sources found at ${STUDY_SOURCES_DIR}. Run "npm run sync" first.`);
    process.exit(1);
  }
  const grades = readYamlGrades();
  fs.rmSync(EXPORT_DIR, { recursive: true, force: true });
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const files = fs.readdirSync(STUDY_SOURCES_DIR).filter((f) => f.endsWith(".json") && !SKIP_FILES.has(f));
  const manifest = { generated_at: new Date().toISOString(), day: schoolLocalDay(), courses: [] };
  const indexLines = [
    "# Canvas export — student-mobilized bundle",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Drop the `.md` files below into NotebookLM (or any other tool/agent) as sources.",
    "`manifest.json` has the same data in machine-readable form for scripted use.",
    "This is a point-in-time export, not a live sync — re-run `npm run export-bundle` after your next `npm run sync` to refresh it.",
    "",
    "## Courses",
    "",
  ];

  let written = 0;
  for (const file of files) {
    const record = readJson(path.join(STUDY_SOURCES_DIR, file));
    if (!record || !record.course) continue;
    const id = record.course.id || path.basename(file, ".json");
    const grade = grades[String(id)];
    const safeName = String(record.course.code || record.course.name || id).replace(/[^\w.-]+/g, "_");
    const mdName = `${safeName}.md`;
    fs.writeFileSync(path.join(EXPORT_DIR, mdName), courseMarkdown(record, grade), "utf8");
    manifest.courses.push({
      id,
      code: record.course.code,
      name: record.course.name,
      grade: grade ? { letter: grade.letter, percent: grade.percent } : null,
      assignment_count: (record.items || []).length,
      source_count: (record.sources || []).length,
      exam_count: (record.exams || []).length,
      md_file: mdName,
    });
    indexLines.push(`- [${record.course.name || record.course.code}](./${mdName})${grade ? ` — ${grade.letter || "ungraded"}` : ""}`);
    written += 1;
  }

  fs.writeFileSync(path.join(EXPORT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(path.join(EXPORT_DIR, "README.md"), indexLines.join("\n") + "\n", "utf8");

  console.log(JSON.stringify({ exported_courses: written, dir: EXPORT_DIR }, null, 2));
}

main();
