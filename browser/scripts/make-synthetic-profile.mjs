/**
 * Write a synthetic `{user_root}` for development and tests: the fixture
 * Canvas payloads in tests/fixtures/canvas-semester run through the same
 * `courseRecord` the live sync uses, so the JSON on disk is exactly what a
 * real sync would produce. Also seeds a calendar-suggestions fixture.
 *
 *   node scripts/make-synthetic-profile.mjs /path/to/root   (default: DEV_USER_ROOT)
 */
import fs from "node:fs";
import path from "node:path";
import { buildFixture } from "../tests/fixtures/canvas-semester/build.mjs";
import { STUDY_SOURCES_SCHEMA, courseRecord } from "./lib/study-sources.mjs";
import { assignCourseColors } from "./lib/semester.mjs";

const FETCHED_AT = "2026-09-18T12:00:00.000Z";

export function writeSyntheticProfile(root) {
  const dir = path.join(root, "inbox", "study-sources");
  fs.mkdirSync(dir, { recursive: true });
  const fixture = buildFixture();
  const colors = assignCourseColors(fixture.map((f) => f.course.id));
  const summaries = [];
  for (const f of fixture) {
    const record = courseRecord({ ...f, syllabus: f.course.syllabus_body, fetchedAt: FETCHED_AT, colorIndex: colors.get(String(f.course.id)) });
    fs.writeFileSync(path.join(dir, `${f.course.id}.json`), JSON.stringify(record, null, 2));
    summaries.push({ id: record.course.id, label: record.course.label, color_index: record.course.color_index, color: record.course.color, sources: record.sources.length, exams: record.exams.length, items: record.items.length, errors: 0 });
  }
  fs.writeFileSync(
    path.join(dir, "status.json"),
    JSON.stringify({ schema: STUDY_SOURCES_SCHEMA, started_at: FETCHED_AT, finished_at: FETCHED_AT, ok: true, partial: false, session: "ok", errors: [], courses: summaries }, null, 2)
  );
  const suggestions = [
    { source_message_id: "msg-fixture-1", title: "PHYS 1110 review session", start: "2026-10-19T23:00:00Z", end: "2026-10-20T00:30:00Z", confidence: 0.82, why: "Instructor email: “review session Monday 5pm, Duane G1B30”" },
    { source_message_id: "msg-fixture-2", title: "Career fair", start: "2026-09-30T16:00:00Z", end: "2026-09-30T20:00:00Z", confidence: 0.55, why: "Campus newsletter mentions the fall career fair" },
  ];
  fs.writeFileSync(path.join(root, "inbox", "calendar-suggestions.jsonl"), suggestions.map((s) => JSON.stringify(s)).join("\n") + "\n");
  return summaries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] || process.env.DEV_USER_ROOT;
  if (!root) {
    console.error("usage: node scripts/make-synthetic-profile.mjs <user_root>");
    process.exit(2);
  }
  const rows = writeSyntheticProfile(path.resolve(root));
  for (const r of rows) console.log(`${r.label}: ${r.items} items, ${r.exams} exam candidates, color ${r.color.name}`);
}
