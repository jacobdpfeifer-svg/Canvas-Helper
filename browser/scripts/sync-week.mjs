/**
 * Canonical week sync — no developer access token required.
 *
 * SSO session cookies → Canvas /api/v1 (planner + todo + assignments +
 * discussions + calendar) → inbox/week.md (durable memory for the agent).
 *
 * DOM scraping is NOT the primary path. Browser UI is only for LTI/external
 * work after triage (WebAssign, ZyBooks, PlayPosit, proctored quizzes).
 *
 * Usage:
 *   cd browser && npm run sync          # next 14 days → inbox/week.md
 *   cd browser && npm run pull-todo     # alias
 *   DAYS=21 npm run sync
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WEEK_PATH,
  INBOX_DIR,
  buildWeekNoteParts,
  collectTruncationWarnings,
  denverDay,
  escCell,
  fetchDueUniverse,
  filterDatedInWindow,
  launchCanvasContext,
  requireLoggedIn,
  shouldIncludeInWeekTable,
  writeCourseCatalogFiles,
} from "./lib/canvas-session.mjs";

const daysAhead = Number(process.env.DAYS || 14);
const today = denverDay();

const { context, page } = await launchCanvasContext();
try {
  await requireLoggedIn(page);
} catch (e) {
  console.error(String(e.message || e));
  await context.close();
  process.exit(1);
}

console.log(`Syncing Canvas REST via SSO (${daysAhead}d, America/Denver)…`);
let courses;
let universe;
let health;
let perCourse;
try {
  ({ courses, universe, health, perCourse } = await fetchDueUniverse(page, {
    daysAhead,
  }));
} catch (e) {
  console.error(String(e.message || e));
  await context.close();
  process.exit(1);
}

const openRows = filterDatedInWindow(universe, {
  today,
  daysAhead,
  includeComplete: false,
}).filter(shouldIncludeInWeekTable);
const doneRows = filterDatedInWindow(universe, {
  today,
  daysAhead,
  includeComplete: true,
}).filter((r) => r.complete);

const healthBits = [
  `courses=${health.courses.count} ok=${health.courses.ok}`,
  `planner=${health.planner.count} ok=${health.planner.ok}`,
  `todo=${health.todo.count} ok=${health.todo.ok}`,
  `assignments=${health.assignments.count} ok=${health.assignments.ok}`,
  `discussions=${health.discussions.count} ok=${health.discussions.ok}`,
  `syllabus=${health.syllabus?.count ?? 0} ok=${health.syllabus?.ok ?? false}`,
  `calendar_a=${health.calendar_assignments.count} ok=${health.calendar_assignments.ok}`,
  `calendar_e=${health.calendar_events.count} ok=${health.calendar_events.ok}`,
];

const notes = [
  `SSO→/api/v1 sync (no developer PAT). ${healthBits.join("; ")}.`,
  "External/LTI rows (WebAssign, ZyBooks, PlayPosit, proctored) need browser UI + Jacob — never auto.",
  `Window: ${today} → +${daysAhead}d America/Denver. Open dated rows: ${openRows.length}; completed in window (hidden from table): ${doneRows.length}.`,
];

if (health.todo.truncated || health.planner.truncated || health.assignments.truncated) {
  notes.push(
    "Pagination truncated on at least one endpoint — re-run sync or raise page cap if a course looks thin."
  );
}

const truncationWarnings = collectTruncationWarnings(health);
if (truncationWarnings.length) {
  notes.push(
    `**TRUNCATION WARNING:** ${truncationWarnings.join("; ")} — week list may be incomplete.`
  );
  console.warn(`TRUNCATION WARNING: ${truncationWarnings.join("; ")}`);
}

if (!openRows.length) {
  notes.push(
    "No open dated items in window — courses may not have published due dates yet, or session lacks API access."
  );
}

const table =
  openRows.length > 0
    ? openRows
        .map((r) => {
          const noteParts = buildWeekNoteParts(r);
          return `| ${escCell(r.course)} | ${escCell(r.title)} | ${escCell(
            String(r.due).replace("T", " ").slice(0, 16)
          )} | ${escCell(r.points)} | ${escCell(r.type)} | ${escCell(
            noteParts.join("; ")
          )} |`;
        })
        .join("\n")
    : "| | | | | | |";

const courseList = courses
  .map((c) => `- ${escCell(c.name || c.course_code)} (\`${c.course_code || c.id}\`)`)
  .join("\n");

const md = `# Week ahead

Updated: ${today}

Source: sso-session-api (planner+todo+assignments+discussions+calendar)

## Due window (${daysAhead}d, open only)

| Course | Assignment | Due | Points | Type | Notes |
|--------|------------|-----|--------|------|-------|
${table}

## Enrolled courses (from /api/v1/courses)

${courseList || "- (none)"}

## Sync notes

${notes.map((n) => `- ${n}`).join("\n")}

## Agent next steps

1. Read \`JACOB.md\` and triage this table (Worth / Agent / Ask).
2. For rows marked external/LTI or assessment — process help only; Jacob does the tool UI.
3. Native Canvas text/file submits: only if auto bar + calibrated course; prefer MCP when PAT exists.
`;

fs.mkdirSync(INBOX_DIR, { recursive: true });
fs.writeFileSync(WEEK_PATH, md, "utf8");
console.log(`Wrote ${WEEK_PATH}`);

const courseFiles = writeCourseCatalogFiles(perCourse, { today });
for (const cf of courseFiles) {
  console.log(
    `Wrote ${cf.file} (catalog=${cf.catalogCount}, checkpoints=${cf.checkpoints}, syllabus=${cf.syllabus}, policyPages=${cf.policyPages})`
  );
}

const hasCoen = courses.some((c) => /coen\s*1500/i.test(c.name || c.course_code || ""));
if (hasCoen) {
  const browserDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const script of ["sync-coen-dinners.mjs", "sync-coen-ai-labs.mjs"]) {
    const proc = spawnSync("node", [`scripts/${script}`], {
      cwd: browserDir,
      stdio: "inherit",
      env: process.env,
    });
    if (proc.status !== 0) {
      console.warn(`${script} exited non-zero — COEN signup cache may be stale`);
    }
  }
}

console.log(
  JSON.stringify(
    {
      courses: courses.length,
      universe: universe.length,
      openRows: openRows.length,
      doneHidden: doneRows.length,
      courseFiles: courseFiles.map((c) => c.code),
      health,
    },
    null,
    2
  )
);
console.log("Review inbox/week.md, then ask for canvas-week-plan.");

await context.close();
