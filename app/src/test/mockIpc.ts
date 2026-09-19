/**
 * Test double for ../ipc. Views are desktop-only, so tests mock the whole
 * module (vi.mock("../ipc", () => mockIpc())) and drive it with these knobs.
 */
import { vi } from "vitest";
import semester1m from "./fixtures/semester-1m.json";
import semester3m from "./fixtures/semester-3m.json";
import semesterAll from "./fixtures/semester-semester.json";
import examPrep from "./fixtures/exam-prep-midterm1.json";
import type * as Ipc from "../ipc";

type Listener<T> = (payload: T) => void;

export function makeMockIpc() {
  const syncListeners: Listener<Ipc.StudySyncEvent>[] = [];
  const inboxListeners: Listener<void>[] = [];
  const calendar: Ipc.CalendarPayload = {
    events: [],
    suggestions: [
      { source_message_id: "m1", title: "PHYS 1110 review session", start: "2026-10-19T23:00:00Z", end: "2026-10-20T00:30:00Z", confidence: 0.82, why: "Instructor email" },
    ],
    decisions: [],
  };
  const calls: string[] = [];
  const state = {
    session: false,
    ssoResult: "ok" as "ok" | "throw" | "no-session",
    syncOutcome: { ok: true } as Ipc.SyncResult,
    onboardingSaved: [] as unknown[],
    planSurfaceReads: 0,
  };
  const fixtures: Record<string, unknown> = { "1m": semester1m, "2m": semester1m, "3m": semester3m, semester: semesterAll };

  const emitSync = (ev: Ipc.StudySyncEvent) => syncListeners.forEach((l) => l(ev));

  const mod: Partial<typeof Ipc> = {
    isTauri: () => false,
    setDockMode: vi.fn(async () => undefined),
    showDock: vi.fn(async () => undefined),
    hideDock: vi.fn(async () => undefined),
    localToday: () => "2026-09-18",
    checkCanvasSession: vi.fn(async () => {
      calls.push("check_canvas_session");
      return state.session;
    }),
    openCanvasSso: vi.fn(async () => {
      calls.push("open_canvas_sso");
      if (state.ssoResult === "throw") throw new Error("open-canvas exited with 1");
      if (state.ssoResult === "ok") state.session = true;
    }),
    saveOnboarding: vi.fn(async (school: string, key: string, opts?: unknown) => {
      state.onboardingSaved.push({ school, key, opts });
    }),
    syncStudySources: vi.fn(async () => {
      calls.push("sync_study_sources");
      return state.syncOutcome;
    }),
    onStudySyncProgress: vi.fn(async (h: Listener<Ipc.StudySyncEvent>) => {
      syncListeners.push(h);
      return () => {
        const i = syncListeners.indexOf(h);
        if (i >= 0) syncListeners.splice(i, 1);
      };
    }),
    onInboxUpdated: vi.fn(async (h: () => void) => {
      inboxListeners.push(h);
      return () => undefined;
    }),
    onSyncFailed: vi.fn(async () => () => undefined),
    readSemester: vi.fn(async (range: Ipc.SemesterRange) => {
      calls.push(`read_semester:${range}`);
      return structuredClone(fixtures[range]) as Ipc.Semester;
    }),
    readExamPrep: vi.fn(async (courseId: string, itemId: string, seed = 0) => {
      calls.push(`read_exam_prep:${courseId}:${itemId}:${seed}`);
      const prep = structuredClone(examPrep) as Ipc.ExamPrep;
      prep.plan.seed = seed;
      if (itemId !== prep.exam.id) {
        prep.exam.id = itemId;
        prep.exam.description = null;
        prep.covers = [];
      }
      return prep;
    }),
    readPlanSurface: vi.fn(async () => {
      calls.push("read_plan_surface");
      state.planSurfaceReads += 1;
      const { EMPTY_PLAN_SURFACE } = await vi.importActual<typeof Ipc>("../ipc");
      return structuredClone(EMPTY_PLAN_SURFACE);
    }),
    readCalendar: vi.fn(async () => {
      calls.push("read_calendar");
      return structuredClone(calendar);
    }),
    addCalendarEvent: vi.fn(async (event: Ipc.NewCalendarEvent) => {
      calls.push("add_calendar_event");
      const row: Ipc.CalendarEvent = {
        id: `ev-${calendar.events.length + 1}`,
        kind: event.kind,
        title: event.title,
        course_id: event.course_id ?? null,
        color_index: event.color_index ?? null,
        start: event.start,
        end: event.end,
        note: event.note ?? "",
        created_at: "2026-09-18T12:00:00Z",
        source: "local",
      };
      calendar.events.push(row);
      return row;
    }),
    deleteCalendarEvent: vi.fn(async (id: string) => {
      const i = calendar.events.findIndex((e) => e.id === id);
      if (i >= 0) calendar.events.splice(i, 1);
    }),
    decideCalendarSuggestion: vi.fn(async (id: string, decision: "added" | "dismissed") => {
      const i = calendar.suggestions.findIndex((s) => s.source_message_id === id);
      const s = calendar.suggestions[i];
      calendar.suggestions.splice(i, 1);
      if (decision === "added" && s) {
        calendar.events.push({ id: `ev-s-${id}`, kind: "personal", title: s.title, course_id: null, color_index: null, start: s.start, end: s.end, note: s.why, created_at: "", source: `suggestion:${id}` });
      }
      calendar.decisions.push({ source_message_id: id, decision, at: "", event_id: null });
      return structuredClone(calendar);
    }),
    openExternal: vi.fn(async (url: string) => {
      calls.push(`open_external:${url}`);
    }),
    setCommitment: vi.fn(async () => ({ commitment: null, check_in: null, line: "" })),
    resolveCommitment: vi.fn(async () => ({ commitment: null, check_in: null, line: "" })),
    recordReviewOutcome: vi.fn(),
    routeIntent: vi.fn(async () => null),
    syncCanvas: vi.fn(async () => ({ ok: true })),
    readTop3: vi.fn(async () => []),
    bootstrapCanvasSync: vi.fn(),
    saveUserProfile: vi.fn(async () => undefined),
    saveLearningProfile: vi.fn(async () => undefined),
  };
  return { mod, state, calls, emitSync, calendar };
}

export type MockIpc = ReturnType<typeof makeMockIpc>;
