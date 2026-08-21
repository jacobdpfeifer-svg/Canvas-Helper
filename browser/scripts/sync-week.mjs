/**
 * Canonical week sync — no developer access token required.
 *
 * SSO session cookies → Canvas /api/v1 (planner + todo + per-course
 * assignments) → inbox/week.md (durable memory for the agent).
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
import {
  WEEK_PATH,
  INBOX_DIR,
  classifyExternalHint,
  escCell,
  fetchDueUniverse,
  isoDay,
  launchCanvasContext,
  requireLoggedIn,
} from "./lib/canvas-session.mjs";

const daysAhead = Number(process.env.DAYS || 14);
const today = isoDay();

const { context, page } = await launchCanvasContext();
try {
  await requireLoggedIn(page);
} catch (e) {
  console.error(String(e.message || e));
  await context.close();
  process.exit(1);
}

console.log(`Syncing Canvas REST via SSO (${daysAhead}d)…`);
const { courses, universe, health } = await fetchDueUniverse(page, {
  daysAhead,
});

const weekEnd = new Date(Date.now() + daysAhead * 86400000);
const weekRows = universe.filter((r) => {
  if (!r.due) return false;
  const d = new Date(r.due);
  return d >= new Date(today) && d <= weekEnd;
});

const notes = [
  `SSO→/api/v1 sync (no developer PAT). courses=${health.courses.count} ok=${health.courses.ok}; planner=${health.planner.count} ok=${health.planner.ok}; todo=${health.todo.count} ok=${health.todo.ok}.`,
  "External/LTI rows (WebAssign, ZyBooks, PlayPosit, proctored) need browser UI + Jacob — never auto.",
];

if (!weekRows.length) {
  notes.push(
    "No dated items in window — courses may not have published due dates yet, or session lacks API access."
  );
}

const table =
  weekRows.length > 0
    ? weekRows
        .map((r) => {
          const hint = classifyExternalHint(r.title, r.type);
          const noteParts = [
            (r.sources || [r.source]).join("+"),
            r.complete ? "done" : "open",
            hint,
          ].filter(Boolean);
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

Source: sso-session-api (planner+todo+course_assignments)

## Due window (${daysAhead}d)

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
console.log(
  JSON.stringify(
    {
      courses: courses.length,
      universe: universe.length,
      weekRows: weekRows.length,
      health,
    },
    null,
    2
  )
);
console.log("Review inbox/week.md, then ask for canvas-week-plan.");

await context.close();
