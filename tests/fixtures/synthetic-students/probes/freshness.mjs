// Part 6 probe: snapshot diff on Avery-shaped generations, a fixture extension delta through a real
// tick (no network, no feeds secret), and the canvas-read.js request shape.
//   DEV_USER_ROOT=var/audit-user-roots/avery-chen node tests/fixtures/synthetic-students/probes/freshness.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const { diffGenerations } = await import(path.join(repo, "browser/scripts/lib/canvas-changes.mjs"));
const { runFreshnessTick } = await import(path.join(repo, "browser/scripts/lib/freshness-run.mjs"));
const { canvasGet, isAllowedPath } = await import(path.join(repo, "app/extension-chrome/lib/canvas-read.js"));

const results = [];
const check = (name, ok, detail = "") => { results.push([name, ok]); console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${detail}`); };

// --- snapshot diff
const thermo = (due, desc) => ({
  course: { id: 7103, name: "ASEN 2402 Thermodynamics", course_code: "ASEN 2402" },
  assignments: [
    { id: 9101, name: "Midterm 1", due_at: due, points_possible: 100, published: true, description: "<p>Chapters 1-5.</p>" },
    { id: 9102, name: "Discussion: where does the second law bite?", due_at: "2026-10-10T05:59:00Z", points_possible: 5, published: true, description: desc },
  ],
});
const prev = { courses: [thermo("2026-10-13T01:00:00Z", "<p>Post one example from lab.</p>")] };
const next = { courses: [thermo("2026-10-15T01:00:00Z", "<p>Post one example from lab <b>and reply to two classmates</b>.</p>")] };
const events = diffGenerations(prev, next, { now: Date.parse("2026-10-05T15:00:00Z") });
const kinds = events.map((e) => e.kind);
check("diff notices moved exam date", kinds.includes("due_changed"), JSON.stringify(events.find((e) => e.kind === "due_changed")?.detail));
check("diff notices edited instructions", kinds.includes("instructions_edited"), events.find((e) => e.kind === "instructions_edited")?.detail?.preview);
check("first sync (no prev) emits nothing", diffGenerations(null, next).length === 0);

// --- tick with a fixture extension delta (announcement) and no network
const root = process.env.DEV_USER_ROOT;
if (!root || !root.includes("audit-user-roots")) throw new Error("set DEV_USER_ROOT to an audit root");
const deltaDir = path.join(root, "inbox", "freshness", "deltas");
fs.mkdirSync(deltaDir, { recursive: true });
fs.writeFileSync(path.join(deltaDir, "0001.json"), JSON.stringify({
  v: 1, ts: "2026-10-05T14:55:00Z", signed_in: true,
  summary: [{ type: "Announcement", count: 1, unread_count: 1 }],
  stream: [{ type: "Announcement", id: 55001, title: "Midterm 1 moved to Wednesday Oct 14", message: "<p>Midterm 1 is now Wednesday, Oct 14 at 7 PM. Bring a calculator. Read chapter 5 before lab.</p>",
             course_id: 7103, created_at: "2026-10-05T14:30:00Z", html_url: "https://canvas.example.invalid/courses/7103/discussion_topics/55001" }],
  planner: [],
}));
let netCalls = 0;
const tick = await runFreshnessTick({ userRoot: root, now: Date.parse("2026-10-05T15:00:00Z"), fetchImpl: async () => { netCalls += 1; throw new Error("no network in audit"); } });
const dash = JSON.parse(fs.readFileSync(path.join(root, "inbox", "freshness", "dashboard.json"), "utf8"));
check("tick processes the delta without a session or network", tick.ok && tick.deltas_processed === 1 && netCalls === 0, JSON.stringify(tick));
check("dashboard shows the announcement as a change", JSON.stringify(dash).includes("Midterm 1 moved"), Object.keys(dash).join(","));
const feedsFile = path.join(root, "auth", "feeds.json");
check("no feeds secret was invented", !fs.existsSync(feedsFile));

// --- canvas-read.js request shape
const calls = [];
const stub = async (url, opts) => { calls.push({ url, opts }); return { status: 200, text: async () => "while(1);{}" }; };
await canvasGet("https://canvas.colorado.edu/", "/api/v1/users/self/activity_stream/summary", { fetchImpl: stub });
const opts = calls[0].opts;
const headerNames = Object.keys(opts.headers || {}).map((h) => h.toLowerCase());
check("canvasGet sends GET only", opts.method === "GET" && Object.keys(opts).every((k) => ["method", "credentials", "headers", "redirect"].includes(k)), JSON.stringify(opts));
check("canvasGet attaches no CSRF token", !headerNames.some((h) => h.includes("csrf")) && !("body" in opts), headerNames.join(","));
let refused = 0;
for (const p of ["/api/v1/courses/7103/assignments/9101/submissions", "/api/v1/courses/7103/discussion_topics/1/entries", "/api/v1/conversations", "/api/v1/courses/7103/assignments/9101/../../../users/self"]) {
  try { await canvasGet("https://canvas.colorado.edu/", p, { fetchImpl: stub }); } catch { refused += 1; }
}
check("write-shaped and traversal paths are refused before fetch", refused === 4 && calls.length === 1, `refused=${refused}`);
try { await canvasGet("https://evil.example/", "/api/v1/planner/items", { fetchImpl: stub }); check("non-Canvas base refused", false); } catch { check("non-Canvas base refused", true); }
check("canvasGet has no method parameter", canvasGet.length <= 3 && !/method\s*[:=]\s*[a-z]/i.test(canvasGet.toString().replace(/method: "GET"/, "")), "signature (base, path, {fetchImpl})");

const failed = results.filter(([, ok]) => !ok).map(([n]) => n);
console.log(failed.length ? `FAIL ${JSON.stringify(failed)}` : "PASS");
process.exitCode = failed.length ? 1 : 0;
