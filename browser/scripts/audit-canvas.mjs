/**
 * Deep SSO→/api/v1 audit (no developer PAT).
 * Routine week updates: prefer `npm run sync` (canonical week.md writer).
 *
 * This script measures recall against the prior week.md using actionable
 * misses (dated ≤14d) vs catalog extras (undated / outside window).
 */
import fs from "node:fs";
import path from "node:path";
import {
  INBOX_DIR,
  WEEK_PATH,
  addDenverDays,
  classifyOutcomeHint,
  collectTruncationWarnings,
  denverDay,
  escCell,
  fetchDueUniverse,
  filterDatedInWindow,
  keyOf,
  launchCanvasContext,
  requireLoggedIn,
} from "./lib/canvas-session.mjs";

function normalizeTitle(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parsePriorWeekMd(text) {
  const keys = new Set();
  const titles = new Set();
  for (const line of text.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (line.includes("Course") && line.includes("Assignment")) continue;
    if (/^\|\s*-+/.test(line)) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (cells.length < 3) continue;
    const [course, title, due] = cells;
    if (!title) continue;
    keys.add(keyOf(course, title, due || ""));
    titles.add(normalizeTitle(title));
  }
  return { keys, titles };
}

function healthRow(label, h) {
  if (!h) return `| ${label} | — | — |`;
  const ok = h.ok == null ? "—" : String(h.ok);
  const extra = h.truncated ? " truncated" : "";
  return `| ${label} | ${ok}${extra} | ${h.count ?? 0} |`;
}

const today = denverDay();
const { context, page } = await launchCanvasContext();
try {
  await requireLoggedIn(page);
} catch (e) {
  console.error(String(e.message || e));
  await context.close();
  process.exit(1);
}

console.log("Fetching due universe (45d) via shared SSO path…");
let courses;
let universe;
let health;
let perCourse;
try {
  ({ courses, universe, health, perCourse } = await fetchDueUniverse(page, {
    daysAhead: 45,
  }));
} catch (e) {
  console.error(String(e.message || e));
  await context.close();
  process.exit(1);
}

const prior = fs.existsSync(WEEK_PATH) ? fs.readFileSync(WEEK_PATH, "utf8") : "";
const { keys: priorKeys, titles: priorTitles } = parsePriorWeekMd(prior);

const actionableWindow = filterDatedInWindow(universe, {
  today,
  daysAhead: 14,
  includeComplete: true,
});

const actionableMisses = [];
for (const r of actionableWindow) {
  const titleHit = priorTitles.has(normalizeTitle(r.title));
  const k = keyOf(r.course, r.title, r.due);
  if (!priorKeys.has(k) && !titleHit) actionableMisses.push(r);
}

const catalogExtras = universe.filter((r) => {
  if (!r.due) return true;
  const dueDay = denverDay(new Date(r.due));
  const endDay = addDenverDays(today, 14);
  return dueDay < today || dueDay > endDay;
});

const undated = universe.filter((r) => !r.due);
const datedForward = universe.filter(
  (r) => r.due && denverDay(new Date(r.due)) >= today
);

fs.mkdirSync(INBOX_DIR, { recursive: true });
const auditPath = path.join(INBOX_DIR, `audit-${today}.md`);

const missList =
  actionableMisses.length > 0
    ? actionableMisses
        .map((r) => {
          const hint = classifyOutcomeHint(r.title, r.type);
          return `- **${escCell(r.title)}** (${escCell(r.course)}) — due ${escCell(
            String(r.due).replace("T", " ").slice(0, 16)
          )} — ${escCell(r.type)}${hint ? ` — ${escCell(hint)}` : ""}`;
        })
        .join("\n")
    : "- None";

const courseLines =
  (perCourse || [])
    .map(
      (c) =>
        `- **${escCell(c.name)}** (\`${c.code || ""}\`, id ${c.id}): assignments=${c.assignments_count} ok=${c.assignments_ok}; discussions=${c.discussions_count} ok=${c.discussions_ok}`
    )
    .join("\n") || "- (none)";

const auditMd = `# Canvas audit ${today}

SSO session audit (no developer API token). Compared against prior \`inbox/week.md\`.

## Executive summary

| Finding | Detail |
|---------|--------|
| Courses enrolled | **${courses.length}** |
| Unique universe items | **${universe.length}** |
| Dated from today forward (45d pull) | **${datedForward.length}** |
| Undated catalog shells | **${undated.length}** |
| Actionable misses (dated ≤14d, not in prior week.md) | **${actionableMisses.length}** |
| Catalog extras (undated or outside 14d) | **${catalogExtras.length}** |

Actionable misses are the accuracy signal. Catalog extras are mostly undated shells, future stubs, and attendance placeholders — not sync failures.

## Endpoint health

| Endpoint | OK | Count |
|----------|----|-------|
${healthRow("/api/v1/courses", health.courses)}
${healthRow("/api/v1/planner/items (45d)", health.planner)}
${healthRow("/api/v1/planner/items filter=incomplete_items", health.planner_incomplete)}
${healthRow("/api/v1/users/self/todo (paginated)", health.todo)}
${healthRow("/api/v1/calendar_events type=assignment", health.calendar_assignments)}
${healthRow("/api/v1/calendar_events type=event", health.calendar_events)}
${healthRow("Per-course /assignments", health.assignments)}
${healthRow("Per-course /discussion_topics (dated)", health.discussions)}

## Courses

${courseLines}

## Actionable misses (dated ≤14d, absent from prior week.md)

${missList}

## Notes

- Remotely proctored / WebAssign / ZyBooks / PlayPosit = Worth-your-time or LTI escape hatch — never auto.
- Canonical week list: run \`npm run sync\` (this audit does **not** overwrite \`inbox/week.md\`).
- Re-run: \`cd browser && npm run audit\`.
`;

fs.writeFileSync(auditPath, auditMd, "utf8");
console.log(`Wrote ${auditPath}`);
console.log(
  JSON.stringify(
    {
      courses: courses.length,
      universe: universe.length,
      actionableMisses: actionableMisses.length,
      catalogExtras: catalogExtras.length,
      undated: undated.length,
      health,
    },
    null,
    2
  )
);

const truncationWarnings = collectTruncationWarnings(health);
if (truncationWarnings.length) {
  console.error(
    `AUDIT FAILED: pagination truncated on: ${truncationWarnings.join("; ")}`
  );
  await context.close();
  process.exit(1);
}

await context.close();
