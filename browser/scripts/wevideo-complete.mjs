/**
 * Full-auto WeVideo / PlayPosit completer (multi-course).
 *
 * Usage:
 *   cd browser && npm run wevideo -- --assignment https://canvas.colorado.edu/courses/.../assignments/...
 *   cd browser && npm run wevideo -- --course LEEDSFYE
 *   cd browser && npm run wevideo -- --course BCOR1030 --all-open
 *   cd browser && npm run wevideo -- --course ONLINEEXP
 *   cd browser && npm run wevideo -- --list   # discover only
 *
 * Requires: npm run open-canvas (SSO in browser/.auth).
 * Optional: OPENAI_API_KEY for stronger answers; WEVIDEO_NO_WEB=1 to skip DuckDuckGo.
 */
import fs from "node:fs";
import path from "node:path";
import {
  COURSES_DIR,
  launchCanvasContext,
  requireLoggedIn,
} from "./lib/canvas-session.mjs";
import { launchWeVideoPlayer } from "./lib/wevideo/canvas-lti.mjs";
import { resolveTargets } from "./lib/wevideo/discover.mjs";
import { runPlayerLoop } from "./lib/wevideo/player.mjs";
import { createSessionLog } from "./lib/wevideo/session-log.mjs";
import { isWeVideoUrl } from "./lib/wevideo/urls.mjs";

function parseArgs(argv) {
  const out = {
    assignment: null,
    course: null,
    allOpen: false,
    list: false,
    limit: Infinity,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--assignment") out.assignment = argv[++i];
    else if (a === "--course") out.course = argv[++i];
    else if (a === "--all-open") out.allOpen = true;
    else if (a === "--list") out.list = true;
    else if (a === "--limit") out.limit = Number(argv[++i] || 1);
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function appendCourseNote(courseCode, line) {
  if (!courseCode) return;
  const file = path.join(COURSES_DIR, `${courseCode}.md`);
  if (!fs.existsSync(file)) return;
  const stamp = new Date().toISOString().slice(0, 10);
  const note = `\n- **${stamp}** — ${line}\n`;
  let text = fs.readFileSync(file, "utf8");
  if (/## Class notes/.test(text)) {
    text = text.replace(/## Class notes\n/, `## Class notes\n${note}`);
  } else {
    text += `\n## Class notes\n${note}`;
  }
  fs.writeFileSync(file, text);
}

function usage() {
  console.log(`WeVideo / PlayPosit full-auto completer

  --assignment URL   Complete one Canvas assignment URL
  --course CODE      BCOR1030 | ONLINEEXP | LEEDSFYE
  --all-open         Include already-submitted WeVideo rows
  --list             Print discovered targets only
  --limit N          Max assignments in this run (default: all)
`);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  usage();
  process.exit(0);
}

const { context, page } = await launchCanvasContext({
  channel: "chrome",
  args: ["--disable-blink-features=AutomationControlled"],
});

try {
  await requireLoggedIn(page);
} catch (e) {
  console.error(String(e.message || e));
  await context.close();
  process.exit(1);
}

const { targets, skipped } = await resolveTargets(page, {
  assignmentUrl: opts.assignment,
  course: opts.course,
  allOpen: opts.allOpen,
});

if (skipped.length) {
  console.log(
    "Skipped non-WeVideo:",
    skipped.map((s) => s.name || s.url).join("; ")
  );
}

console.log(`Found ${targets.length} WeVideo/PlayPosit target(s)`);
for (const t of targets) {
  console.log(` - [${t.courseCode}] ${t.name} (${t.url}) newTab=${t.newTab}`);
}

if (opts.list) {
  await context.close();
  process.exit(0);
}

if (!targets.length) {
  console.error("No WeVideo targets. Try --all-open or --assignment URL.");
  await context.close();
  process.exit(2);
}

const batch = targets.slice(0, opts.limit);
const summary = [];

for (const assignment of batch) {
  const log = createSessionLog(
    `${assignment.courseCode || "x"}-${assignment.id || "assign"}`
  );
  log.event("start", {
    name: assignment.name,
    url: assignment.url,
    toolUrl: assignment.toolUrl,
  });
  console.log("\n=== Completing:", assignment.name);

  try {
    if (assignment.toolUrl && !isWeVideoUrl(assignment.toolUrl)) {
      log.finish({ status: "skipped_not_wevideo" });
      summary.push({ name: assignment.name, status: "skipped_not_wevideo" });
      continue;
    }

    const player = await launchWeVideoPlayer(page, context, assignment, log);
    const result = await runPlayerLoop(player, {
      courseCode: assignment.courseCode,
      log,
    });
    const file = log.finish({ status: result.status, answered: result.answered });
    console.log("Result:", result.status, "answered=", result.answered, "log=", file);

    const note =
      result.status === "completed"
        ? `WeVideo complete: ${assignment.name} (${result.answered} interactions) — Canvas passback pending`
        : `WeVideo ${result.status}: ${assignment.name} (answered ${result.answered}) — see ${path.basename(file)}`;
    appendCourseNote(assignment.courseCode, note);
    summary.push({ name: assignment.name, ...result, log: file });
  } catch (e) {
    console.error("Failed:", e.message || e);
    log.finish({ status: "error", error: String(e.message || e) });
    summary.push({ name: assignment.name, status: "error", error: String(e.message || e) });
  }
}

console.log("\n=== Summary");
console.log(JSON.stringify(summary, null, 2));
await context.close();
process.exit(summary.some((s) => s.status === "error") ? 1 : 0);
