/**
 * Deep SSO→/api/v1 audit (no developer PAT).
 * Routine week updates: prefer `npm run sync`.
 */
import fs from "node:fs";
import path from "node:path";
import {
  INBOX_DIR,
  WEEK_PATH,
  api,
  apiAllPages,
  classifyExternalHint,
  dedupeRows,
  escCell,
  fromAssignments,
  fromPlanner,
  fromTodo,
  isoDay,
  keyOf,
  launchCanvasContext,
  requireLoggedIn,
} from "./lib/canvas-session.mjs";

function fromCalendar(events) {
  const rows = [];
  for (const e of events || []) {
    rows.push({
      source: "calendar",
      course: e.context_name || e.context_code || "",
      title: e.title || "Event",
      due: e.start_at || e.end_at || "",
      points: "",
      type: e.type || "calendar_event",
      html_url: e.html_url || "",
      complete: false,
      course_id: (String(e.context_code || "").match(/course_(\d+)/) || [])[1],
    });
  }
  return rows;
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
    titles.add(title.toLowerCase());
  }
  return { keys, titles };
}

const today = isoDay();
const { context, page } = await launchCanvasContext();
try {
  await requireLoggedIn(page);
} catch (e) {
  console.error(String(e.message || e));
  await context.close();
  process.exit(1);
}

const start = new Date();
start.setUTCHours(0, 0, 0, 0);
const end45 = new Date(Date.now() + 45 * 86400000);
const startIso = start.toISOString();
const endIso = end45.toISOString();

console.log("Fetching courses…");
const coursesRes = await apiAllPages(page, "/api/v1/courses", {
  enrollment_state: "active",
});
const courses = coursesRes.ok ? coursesRes.items : [];

console.log("Fetching planner (45d)…");
const plannerRes = await apiAllPages(page, "/api/v1/planner/items", {
  start_date: startIso,
  end_date: endIso,
});

console.log("Fetching users/self/todo…");
const todoRes = await api(page, "/api/v1/users/self/todo?per_page=50");
const todoItems =
  todoRes.ok && Array.isArray(todoRes.json) ? todoRes.json : [];

console.log("Fetching calendar events (45d)…");
const calRes = await apiAllPages(page, "/api/v1/calendar_events", {
  type: "assignment",
  start_date: startIso.slice(0, 10),
  end_date: endIso.slice(0, 10),
  all_events: "true",
});
const calEvRes = await apiAllPages(page, "/api/v1/calendar_events", {
  type: "event",
  start_date: startIso.slice(0, 10),
  end_date: endIso.slice(0, 10),
  all_events: "true",
});

const allRows = [
  ...fromPlanner(plannerRes.items),
  ...fromTodo(todoItems),
  ...fromCalendar(calRes.items),
  ...fromCalendar(calEvRes.items),
];

const perCourse = [];
for (const c of courses) {
  const id = c.id;
  const name = c.name || c.course_code || String(id);
  console.log(`  assignments for ${name} (${id})…`);
  const aRes = await apiAllPages(page, `/api/v1/courses/${id}/assignments`, {
    order_by: "due_at",
    include: "submission",
  });
  const rows = fromAssignments(name, id, aRes.items || []);
  perCourse.push({
    id,
    name,
    code: c.course_code,
    ok: aRes.ok,
    count: rows.length,
  });
  if (aRes.ok) allRows.push(...rows);
}

const prior = fs.existsSync(WEEK_PATH) ? fs.readFileSync(WEEK_PATH, "utf8") : "";
const { keys: priorKeys, titles: priorTitles } = parsePriorWeekMd(prior);
const universe = dedupeRows(allRows);

const missedByTitleOnly = [];
for (const r of universe) {
  const titleHit = priorTitles.has((r.title || "").toLowerCase());
  const k = keyOf(r.course, r.title, r.due);
  if (!priorKeys.has(k) && !titleHit) missedByTitleOnly.push(r);
}

const weekEnd = new Date(Date.now() + 7 * 86400000);
const weekTable = universe
  .filter((r) => {
    if (!r.due) return false;
    const d = new Date(r.due);
    return d >= new Date(today) && d <= weekEnd;
  })
  .slice(0, 80);

const weekMd = `# Week ahead

Updated: ${today}

Source: sso-session-api (audit comprehensive)

## Due this week (refreshed)

| Course | Assignment | Due | Points | Type | Notes |
|--------|------------|-----|--------|------|-------|
${
  weekTable.length
    ? weekTable
        .map((r) => {
          const hint = classifyExternalHint(r.title, r.type);
          const note = [(r.sources || [r.source]).join("+"), hint]
            .filter(Boolean)
            .join("; ");
          return `| ${escCell(r.course)} | ${escCell(r.title)} | ${escCell(
            String(r.due).replace("T", " ").slice(0, 16)
          )} | ${escCell(r.points)} | ${escCell(r.type)} | ${escCell(note)} |`;
        })
        .join("\n")
    : "| | | | | | |"
}

## Audit pointer

See \`inbox/audit-${today}.md\` for full 45-day comparison vs prior capture.
`;

fs.mkdirSync(INBOX_DIR, { recursive: true });
fs.writeFileSync(WEEK_PATH, weekMd, "utf8");

const auditPath = path.join(INBOX_DIR, `audit-${today}.md`);
const undated = universe.filter((r) => !r.due);
const next45 = universe.filter(
  (r) => r.due && new Date(r.due) >= new Date(today)
);

const auditMd = `# Canvas audit ${today}

SSO session audit (no developer API token). Compared against prior \`inbox/week.md\`.

## Endpoint health

| Endpoint | OK | Count |
|----------|----|-------|
| /api/v1/courses | ${coursesRes.ok} | ${courses.length} |
| /api/v1/planner/items (45d) | ${plannerRes.ok} | ${plannerRes.items?.length ?? 0} |
| /api/v1/users/self/todo | ${todoRes.ok} (${todoRes.status}) | ${todoItems.length} |
| /api/v1/calendar_events type=assignment | ${calRes.ok} | ${calRes.items?.length ?? 0} |
| /api/v1/calendar_events type=event | ${calEvRes.ok} | ${calEvRes.items?.length ?? 0} |
| Per-course /assignments | — | ${perCourse.reduce((n, c) => n + c.count, 0)} total |

## Courses

${perCourse.map((c) => `- **${escCell(c.name)}** (\`${c.code || ""}\`, id ${c.id}): assignments=${c.count}, ok=${c.ok}`).join("\n") || "- (none)"}

## Universe summary

- Unique items: **${universe.length}**
- Dated from today forward: **${next45.length}**
- Undated: **${undated.length}**
- Missed vs prior titles: **${missedByTitleOnly.length}**

## Missed vs prior week.md

${
  missedByTitleOnly
    .map(
      (r) =>
        `- **${escCell(r.title)}** (${escCell(r.course)}) — due ${escCell(r.due) || "undated"} — ${escCell(r.type)}`
    )
    .join("\n") || "- None"
}

## Notes

- Remotely proctored / WebAssign / ZyBooks / PlayPosit = Worth-your-time or LTI escape hatch — never auto.
- \`inbox/week.md\` refreshed for the next 7 days from this audit.
`;

fs.writeFileSync(auditPath, auditMd, "utf8");
console.log(`Wrote ${auditPath}`);
console.log(`Wrote ${WEEK_PATH}`);
console.log(
  JSON.stringify(
    {
      courses: courses.length,
      universe: universe.length,
      missed: missedByTitleOnly.length,
      weekTable: weekTable.length,
    },
    null,
    2
  )
);

await context.close();
