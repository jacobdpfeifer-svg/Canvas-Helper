#!/usr/bin/env bash
# Build a STUBBED core dir for running the desktop app end-to-end with no
# Canvas at all (the "stubbed SSO" harness from the round-1 prompt §4):
#   - check-canvas-session → {"loggedIn": <STUB_LOGGED_IN, default true>}
#   - open-canvas          → marks the stub session as logged in, exits 0
#   - sync-study-sources   → writes the synthetic 4-course profile into the
#                            user root, streaming progress events with delays
#   - sync-week            → no-op
# Everything else (Python study core, templates, skills) is the real checkout.
#
#   scripts/stub-core.sh                 # → ~/.cache/<checkout-name>-stub-core
#   PRODUCTNAME_CORE_DIR=$(scripts/stub-core.sh) DEV_USER_ROOT=/tmp/pn-fresh \
#     PRODUCTNAME_PYTHON=$PWD/.venv/bin/python npm run tauri -- dev
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
# Default name is derived from the checkout so parallel worktrees never share a stub.
STUB="${PRODUCTNAME_STUB_CORE:-$HOME/.cache/$(basename "$REPO")-stub-core}"
mkdir -p "$STUB"
for d in src browser schools templates skills plugins; do
  rsync -a --delete --exclude __pycache__ --exclude .auth --exclude node_modules "$REPO/$d/" "$STUB/$d/"
done
ln -sfn "$REPO/browser/node_modules" "$STUB/browser/node_modules"
S="$STUB/browser/scripts"
cat > "$S/check-canvas-session.mjs" <<'JS'
import fs from "node:fs";
import path from "node:path";
import { resolveUserRoot } from "./lib/canvas-session.mjs";
const flag = path.join(resolveUserRoot({ create: true }), "auth", "stub-logged-in");
const loggedIn = process.env.STUB_LOGGED_IN === "1" || fs.existsSync(flag);
console.log(JSON.stringify({ loggedIn, stub: true }));
JS
cat > "$S/open-canvas.mjs" <<'JS'
import fs from "node:fs";
import path from "node:path";
import { resolveUserRoot } from "./lib/canvas-session.mjs";
const delay = Number(process.env.STUB_SSO_DELAY_MS || 1500);
await new Promise((r) => setTimeout(r, delay));
if (process.env.STUB_SSO_FAIL === "1") { console.error("stub: login window closed"); process.exit(1); }
const dir = path.join(resolveUserRoot({ create: true }), "auth");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "stub-logged-in"), new Date().toISOString());
console.log("stub: signed in");
JS
cat > "$S/sync-study-sources.mjs" <<'JS'
import fs from "node:fs";
import path from "node:path";
import { resolveUserRoot } from "./lib/canvas-session.mjs";
import { buildFixture } from "../tests/fixtures/canvas-semester/build.mjs";
import { STUDY_SOURCES_SCHEMA, courseLabel, courseRecord } from "./lib/study-sources.mjs";
import { COURSE_PALETTE, assignCourseColors } from "./lib/semester.mjs";
const root = resolveUserRoot({ create: true });
const flag = path.join(root, "auth", "stub-logged-in");
const emit = (e) => process.stdout.write(JSON.stringify(e) + "\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outDir = path.join(root, "inbox", "study-sources");
fs.mkdirSync(outDir, { recursive: true });
if (!(process.env.STUB_LOGGED_IN === "1" || fs.existsSync(flag))) {
  emit({ event: "done", ok: false, session: "expired_or_missing", error: "stub: no session", courses: [] });
  process.exit(1);
}
const fixture = buildFixture();
const colors = assignCourseColors(fixture.map((f) => f.course.id));
emit({ event: "courses", courses: fixture.map((f) => ({ id: String(f.course.id), label: courseLabel(f.course), color_index: colors.get(String(f.course.id)), color: COURSE_PALETTE[colors.get(String(f.course.id))] })) });
const summaries = [];
const failId = process.env.STUB_FAIL_COURSE || "";
for (const f of fixture) {
  await sleep(Number(process.env.STUB_COURSE_DELAY_MS || 700));
  const record = courseRecord({ ...f, syllabus: f.course.syllabus_body, fetchedAt: new Date().toISOString(), colorIndex: colors.get(String(f.course.id)), errors: String(f.course.id) === failId ? ["stub: pages 500"] : [] });
  const counts = { assignments: 0, quizzes: 0, exams: 0, discussions: 0, other: 0 };
  for (const i of record.items) counts[i.kind === "quiz" ? "quizzes" : i.kind === "exam" ? "exams" : i.kind === "discussion" ? "discussions" : i.kind === "other" ? "other" : "assignments"]++;
  if (String(f.course.id) !== failId) fs.writeFileSync(path.join(outDir, `${f.course.id}.json`), JSON.stringify(record, null, 2));
  const summary = { id: record.course.id, label: record.course.label, color_index: record.course.color_index, color: record.course.color, sources: record.sources.length, exams: record.exams.length, items: record.items.length, counts, term_source: record.term.source, errors: record.errors.length };
  summaries.push(summary);
  emit({ event: "course", ok: record.errors.length === 0, course: summary, errors: record.errors });
}
const status = { schema: STUDY_SOURCES_SCHEMA, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), ok: true, partial: summaries.some((c) => c.errors > 0), session: "ok", errors: [], courses: summaries };
fs.writeFileSync(path.join(outDir, "status.json"), JSON.stringify(status, null, 2));
const sug = path.join(root, "inbox", "calendar-suggestions.jsonl");
if (!fs.existsSync(sug)) fs.writeFileSync(sug, JSON.stringify({ source_message_id: "msg-fixture-1", title: "PHYS 1110 review session", start: "2026-10-19T23:00:00Z", end: "2026-10-20T00:30:00Z", confidence: 0.82, why: "Instructor email: review session Monday 5pm" }) + "\n");
emit({ event: "done", ok: true, partial: status.partial, session: "ok", errors: [], courses: summaries });
JS
cat > "$S/sync-week.mjs" <<'JS'
console.log("stub: week sync skipped");
JS
echo "$STUB"
