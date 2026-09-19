/**
 * DEV-ONLY screenshot / walkthrough harness. Installs a fake
 * `window.__TAURI_INTERNALS__` backed by the test fixtures so the REAL app
 * bundle can be viewed in a plain browser (Vite: /dev/fixture.html). This is
 * not a product path: the app itself has no browser mode. Query params:
 *   ?onboarded=0        start at first run (default: onboarded)
 *   ?session=1          check_canvas_session → true
 *   ?sso=fail           open_canvas_sso rejects
 *   ?fail=3103          one course fails during sync
 *   ?theme=paper|night|forest|contrast
 */
import semester1m from "../src/test/fixtures/semester-1m.json";
import semester3m from "../src/test/fixtures/semester-3m.json";
import semesterAll from "../src/test/fixtures/semester-semester.json";
import examPrep from "../src/test/fixtures/exam-prep-midterm1.json";

const q = new URLSearchParams(location.search);
const callbacks = new Map<number, (payload: unknown) => void>();
const listeners = new Map<string, number[]>();
let nextId = 1;
let session = q.get("session") === "1";
const events: unknown[] = [];
const decisions: string[] = [];
let commitment: unknown = null;
let suggestions = [
  { source_message_id: "m1", title: "PHYS 1110 review session", start: "2026-10-19T23:00:00Z", end: "2026-10-20T00:30:00Z", confidence: 0.82, why: "Instructor email: review session Monday 5pm, Duane G1B30" },
  { source_message_id: "m2", title: "Career fair", start: "2026-09-30T16:00:00Z", end: "2026-09-30T20:00:00Z", confidence: 0.55, why: "Campus newsletter mentions the fall career fair" },
];

function emit(event: string, payload: unknown) {
  for (const id of listeners.get(event) ?? []) callbacks.get(id)?.({ event, id, payload });
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const courses = (semesterAll as { courses: { id: string; label: string; color_index: number; color: unknown; ticks: { kind: string }[] }[] }).courses;

const callLog: { cmd: string; at: number }[] = [];
(window as unknown as { __shimCalls: unknown }).__shimCalls = callLog;

async function invoke(cmd: string, args: Record<string, unknown> = {}): Promise<unknown> {
  if (!cmd.startsWith("plugin:")) callLog.push({ cmd, at: performance.now() });
  await sleep(cmd.startsWith("read_") ? 40 : 10);
  switch (cmd) {
    case "plugin:event|listen": {
      const id = args.handler as number;
      const ev = args.event as string;
      listeners.set(ev, [...(listeners.get(ev) ?? []), id]);
      return id;
    }
    case "plugin:event|unlisten":
      return null;
    case "set_dock_mode":
    case "show_dock":
    case "hide_dock":
      return null;
    case "check_canvas_session":
      return session;
    case "open_canvas_sso":
      await sleep(1200);
      if (q.get("sso") === "fail") throw new Error("open-canvas exited with exit status: 1");
      session = true;
      return null;
    case "save_onboarding":
      return null;
    case "sync_study_sources": {
      const fail = q.get("fail");
      await sleep(600);
      emit("study-sync-progress", { event: "courses", courses: courses.map((c) => ({ id: c.id, label: c.label, color_index: c.color_index, color: c.color })) });
      for (const c of courses) {
        await sleep(900);
        const counts = { assignments: 0, quizzes: 0, exams: 0, discussions: 0, other: 0 };
        for (const t of c.ticks) counts[(t.kind === "quiz" ? "quizzes" : t.kind === "exam" ? "exams" : t.kind === "discussion" ? "discussions" : t.kind === "other" ? "other" : "assignments") as keyof typeof counts]++;
        const ok = c.id !== fail;
        emit("study-sync-progress", { event: "course", ok, course: { id: c.id, label: c.label, color_index: c.color_index, color: c.color, counts }, errors: ok ? [] : ["pages: 500"] });
      }
      emit("study-sync-progress", { event: "done", ok: !fail, partial: Boolean(fail), session: "ok", courses: [] });
      return { ok: !fail, error: fail ? "1 course error" : null };
    }
    case "read_semester": {
      const r = args.range as string;
      return clone(r === "3m" ? semester3m : r === "semester" ? semesterAll : semester1m);
    }
    case "read_exam_prep": {
      const prep = clone(examPrep) as { exam: { id: string; description: string | null }; covers: unknown[]; plan: { seed: number } };
      prep.plan.seed = (args.seed as number) ?? 0;
      if (args.itemId !== prep.exam.id) {
        prep.exam.id = args.itemId as string;
        prep.exam.description = null;
        prep.covers = [];
      }
      return prep;
    }
    case "read_plan_surface":
      return {
        due: { items: [], practice: { state: "idle", line: "", obstacle: "", open_with: "" }, coverage: [], health: { fragile: 0, holding: 0, durable: 0, attempt_only: 0, delayed_hit_signal: 0, next_review_at: null, next_checkpoint_due: null, line: "" }, budget: { now: 0, later: 0, later_checkpoint: null, line: "" }, trail: { line: "", learning: [], workflow: [] }, garden: { note: "", courses: [] }, commitment: { commitment: null, check_in: null, line: "" } },
        if_then: "",
        streak: { streak: 0, last_brief_date: null, briefed_today: false, line: "" },
        progress: { courses: [], totals: { fragile: 0, holding: 0, durable: 0, total: 0 } },
        evaluation: { ok: false },
        commitment: { commitment, check_in: null, line: "" },
        errors: [],
      };
    case "read_calendar":
      return { events: clone(events), suggestions: clone(suggestions), decisions: [] };
    case "add_calendar_event": {
      const e = args.event as Record<string, unknown>;
      const row = { id: `ev-${events.length + 1}`, ...e, note: e.note ?? "", created_at: new Date().toISOString(), source: "local" };
      events.push(row);
      return row;
    }
    case "delete_calendar_event": {
      const i = events.findIndex((e) => (e as { id: string }).id === args.id);
      if (i >= 0) events.splice(i, 1);
      return null;
    }
    case "decide_calendar_suggestion": {
      const s = suggestions.find((x) => x.source_message_id === args.messageId);
      suggestions = suggestions.filter((x) => x.source_message_id !== args.messageId);
      decisions.push(args.decision as string);
      if (s && args.decision === "added") events.push({ id: `ev-s-${s.source_message_id}`, kind: "personal", title: s.title, course_id: null, color_index: null, start: s.start, end: s.end, note: s.why, created_at: "", source: `suggestion:${s.source_message_id}` });
      return { events: clone(events), suggestions: clone(suggestions), decisions: [] };
    }
    case "open_external":
      console.info("[shim] open_external", args.url);
      return null;
    case "set_commitment":
      commitment = { id: "c1", text: (args.text as string) || "", course: (args.course as string) || "", deadline: args.deadline, linked_item_id: "", created_at: "", status: "open", resolved_at: null };
      return { commitment, check_in: null, line: "" };
    case "resolve_commitment":
      commitment = null;
      return { commitment: null, check_in: null, line: "" };
    case "runtime_info":
      return { mode: "dev", core_dir: "/fixture", python: "/fixture/python", node: "/fixture/node", profile_id: "fixture", user_root: "/tmp/fixture", diagnostics: [] };
    case "list_profiles":
      return { current: "fixture", profiles: ["fixture"], root: "/tmp" };
    case "study": {
      const req = args.request as { cmd: string };
      if (req.cmd === "status") return { ok: true, courses: ["CSCI 2270 — Data Structures"], exams: [], log: { events: 0, partial_tail: false }, clock: { status: "ok", note: "fixture" } };
      if (req.cmd === "packets") return { ok: true, packets: [] };
      if (req.cmd === "canvas-sources") return { ok: true, status: { state: "ok", line: "Canvas sources are current.", last_sync: "2026-09-18T12:00:00Z", courses: [] }, courses: courses.map((c) => ({ course_id: c.id, label: c.label, fetched_at: "2026-09-18T12:00:00Z", sources: [], exams: [], errors: [], imported_version: null, imported_source_ids: [] })) };
      if (req.cmd === "offer") return { ok: true, kind: "missing_source", reason: "No practice item is ready in this fixture." };
      if (req.cmd === "ai-status") return { ok: true, connected: false };
      if (req.cmd === "connectors-status") return { ok: true, connectors: { gcal: { state: "disconnected" }, outlook: { state: "disconnected" } } };
      return { ok: false, error: { code: "fixture", message: `no fixture for ${req.cmd}` } };
    }
    default:
      console.warn("[shim] unhandled", cmd, args);
      return null;
  }
}

(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
  invoke,
  transformCallback(cb: (payload: unknown) => void) {
    const id = nextId++;
    callbacks.set(id, cb);
    return id;
  },
  unregisterCallback(id: number) {
    callbacks.delete(id);
  },
  metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main", windowLabel: "main" } },
  plugins: {},
  convertFileSrc: (p: string) => p,
};
(window as unknown as { __TAURI_EVENT_PLUGIN_INTERNALS__: unknown }).__TAURI_EVENT_PLUGIN_INTERNALS__ = {
  unregisterListener(event: string, id: number) {
    listeners.set(event, (listeners.get(event) ?? []).filter((x) => x !== id));
  },
};
if (q.get("onboarded") === "0") localStorage.removeItem("pn_onboarded");
else localStorage.setItem("pn_onboarded", "1");
if (q.get("theme")) localStorage.setItem("pn_theme", q.get("theme") as string);
if (q.get("range")) localStorage.setItem("pn_home_range", q.get("range") as string);
