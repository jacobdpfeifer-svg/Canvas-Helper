import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type Top3Item = { id: string; title: string; due: string };

export type SyncResult = { ok: boolean; error?: string | null };

export type RouteResult = {
  skill_id: string | null;
  method: string;
  ambiguous: boolean;
  model_tier: string | null;
  raw: string;
};

export type DockMode = "onboarding" | "peek" | "expanded" | "workspace";

/**
 * Desktop-only (2026-09-18 UI round 1): every call here goes to the Tauri
 * daemon. There is no browser-mode product path any more — tests mock this
 * module (vi.mock("../ipc")) instead of relying on empty fallbacks.
 */

/** Native dock commands share this adapter with all other frontend IPC. */
export async function setDockMode(mode: DockMode): Promise<void> {
  await invoke("set_dock_mode", { mode });
}

export async function showDock(): Promise<void> {
  await invoke("show_dock");
}

export async function hideDock(): Promise<void> {
  await invoke("hide_dock");
}

/** True inside the Tauri webview. Only the study dev bridge (a developer
 * tool for `vite` alone) still branches on it. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function syncCanvas(): Promise<SyncResult> {
  return invoke<SyncResult>("sync_canvas");
}

export async function readTop3(): Promise<Top3Item[]> {
  return invoke<Top3Item[]>("read_top3");
}

/** Opens the school SSO in a separate Playwright window; resolves when it closes. */
export async function openCanvasSso(): Promise<void> {
  await invoke("open_canvas_sso");
}

/** Headless probe: is there already a valid Canvas session in the profile's auth dir? */
export async function checkCanvasSession(): Promise<boolean> {
  return invoke<boolean>("check_canvas_session");
}

/**
 * Fire-and-forget deep, full-term week sync. Onboarding no longer calls this
 * directly (sync_study_sources kicks it after the sources sync); Settings'
 * preferences flow still may.
 */
export function bootstrapCanvasSync(): void {
  void invoke("bootstrap_canvas_sync").catch((e) => {
    console.error("bootstrap sync failed to launch", e);
  });
}

export async function saveOnboarding(
  schoolSlug: string,
  cloudKey: string,
  options?: {
    priorities?: string;
    sentryOptIn?: boolean;
    waitlistEmail?: string;
  }
): Promise<void> {
  await invoke("save_onboarding", {
    schoolSlug,
    cloudKey,
    priorities: options?.priorities ?? null,
    sentryOptIn: options?.sentryOptIn ?? null,
    waitlistEmail: options?.waitlistEmail ?? null,
  });
}

export type OnboardingIdentity = {
  name: string;
  institution: string;
  schoolSlug: string;
  major: string;
  minor: string;
  catalogYear: string;
  targetGradTerm: string;
  interests: string[];
  goodStandingGpa: string;
  scholarshipMinGpa: string;
  careerPriorities: string[];
  values: string[];
  transferNotes: string;
};

/** Write the onboarding "Profile" step's answers into USER.md (see
 * canvas_mcp.core.user_profile). */
export async function saveUserProfile(
  identity: OnboardingIdentity
): Promise<void> {
  await invoke("save_user_profile", {
    name: identity.name,
    institution: identity.institution,
    schoolSlug: identity.schoolSlug,
    major: identity.major,
    minor: identity.minor,
    catalogYear: identity.catalogYear,
    targetGradTerm: identity.targetGradTerm,
    interests: identity.interests,
    goodStandingGpa: identity.goodStandingGpa,
    scholarshipMinGpa: identity.scholarshipMinGpa,
    careerPriorities: identity.careerPriorities,
    values: identity.values,
    transferNotes: identity.transferNotes,
  });
}

export type LearningProfileAnswers = {
  practiceFormat: "worked_example" | "retrieval";
  autonomy: "directive" | "choices";
  chunkSize: "short" | "long";
  checkDepth: "light" | "thorough";
  ifThen?: string;
};

export type DueReview = {
  id: string;
  course: string;
  claim: string;
  kind: string;
  stability: string;
  start_with_example: boolean;
  checkpoint_due: string | null;
  gap_days: number;
  why?: string;
  rung?: string;
  missing?: string;
  counterfactual?: string;
};

export type KnowledgeHealth = {
  fragile: number;
  holding: number;
  durable: number;
  attempt_only: number;
  delayed_hit_signal: number;
  next_review_at: string | null;
  next_checkpoint_due: string | null;
  line: string;
};

export type PracticeState =
  | "due_now"
  | "in_the_gap"
  | "unextracted"
  | "recovery"
  | "idle";

export type PracticeSurface = {
  state: PracticeState;
  line: string;
  obstacle?: string;
  open_with?: string;
  recovery?: boolean;
  focus_stale?: boolean;
  counterfactual?: string;
};

export type ReviewBudget = {
  now: number;
  later: number;
  later_checkpoint: string | null;
  line: string;
};

export type TrailEvent = {
  kind: string;
  course: string;
  ref: string;
  label: string;
  ts: string;
};

export type Trail = {
  line: string;
  learning: TrailEvent[];
  workflow: TrailEvent[];
};

export type GardenCourse = {
  course: string;
  delayed_retrieval: number;
  corrected_miss: number;
  path: number;
  checkpoint_passed: boolean;
  line: string;
};

export type Garden = {
  note: string;
  courses: GardenCourse[];
};

export type CommitmentRecord = {
  id: string;
  text: string;
  course: string;
  deadline: string;
  linked_item_id: string;
  created_at: string;
  status: string;
  resolved_at: string | null;
};

export type CommitmentState = {
  commitment: CommitmentRecord | null;
  check_in: CommitmentRecord | null;
  line: string;
};

export type CoverageRow = {
  course: string;
  label: string;
  due: string | null;
  state: "due_now" | "in_the_gap" | "unextracted";
  fragile: number;
  holding: number;
  durable: number;
  next_check: string | null;
  line: string;
};

export type DueReviewsPayload = {
  items: DueReview[];
  practice: PracticeSurface;
  coverage: CoverageRow[];
  health: KnowledgeHealth;
  budget: ReviewBudget;
  trail: Trail;
  garden: Garden;
  commitment: CommitmentState;
};

export type ReviewOutcome = "miss" | "partial" | "hit" | "skipped";

export type ScoredReview = DueReview & {
  next_review_at?: string;
  last_outcome?: string | null;
  stability_delta?: string | null;
};

export async function saveLearningProfile(
  answers: LearningProfileAnswers
): Promise<void> {
  await invoke("save_learning_profile", {
    practiceFormat: answers.practiceFormat,
    autonomy: answers.autonomy,
    chunkSize: answers.chunkSize,
    checkDepth: answers.checkDepth,
    ifThen: answers.ifThen ?? "",
  });
}

export type BriefStreak = {
  streak: number;
  last_brief_date: string | null;
  briefed_today: boolean;
  line: string;
};

export type ProgressClaim = { claim: string; stability: string };

export type CourseProgress = {
  course: string;
  fragile: number;
  holding: number;
  durable: number;
  total: number;
  claims: ProgressClaim[];
};

export type LearnProgress = {
  courses: CourseProgress[];
  totals: {
    fragile: number;
    holding: number;
    durable: number;
    total: number;
  };
};

export type EvalCounts = {
  delayed_reviews_open: number;
  delayed_hit_signal: number;
  overdue_work: number;
  deadline_surprises: number;
};

export type EvaluationCompare = {
  ok: boolean;
  before?: EvalCounts;
  after?: EvalCounts;
  deltas?: EvalCounts;
  note?: string;
  reason?: string;
};

export type PlanSurface = {
  due: DueReviewsPayload;
  if_then: string;
  streak: BriefStreak;
  progress: LearnProgress;
  evaluation: EvaluationCompare;
  commitment: CommitmentState;
  /** Sections that fell back to their empty shape, with the reason. */
  errors: string[];
};

export const EMPTY_DUE: DueReviewsPayload = {
  items: [],
  practice: { state: "idle", line: "", obstacle: "", open_with: "" },
  coverage: [],
  health: {
    fragile: 0,
    holding: 0,
    durable: 0,
    attempt_only: 0,
    delayed_hit_signal: 0,
    next_review_at: null,
    next_checkpoint_due: null,
    line: "",
  },
  budget: { now: 0, later: 0, later_checkpoint: null, line: "" },
  trail: { line: "", learning: [], workflow: [] },
  garden: { note: "", courses: [] },
  commitment: { commitment: null, check_in: null, line: "" },
};

export const EMPTY_PLAN_SURFACE: PlanSurface = {
  due: EMPTY_DUE,
  if_then: "",
  streak: { streak: 0, last_brief_date: null, briefed_today: false, line: "" },
  progress: { courses: [], totals: { fragile: 0, holding: 0, durable: 0, total: 0 } },
  evaluation: { ok: false },
  commitment: { commitment: null, check_in: null, line: "" },
  errors: [],
};

/**
 * The whole Calendar-tab surface in ONE round trip (was six, each a Python
 * process spawned on the main thread). Shapes are normalised here so a
 * partial payload never throws in a view.
 */
export async function readPlanSurface(): Promise<PlanSurface> {
  const p = await invoke<Partial<PlanSurface>>("read_plan_surface");
  const due = p?.due ?? EMPTY_DUE;
  return {
    due: {
      items: Array.isArray(due.items) ? due.items : [],
      practice: due.practice ?? EMPTY_DUE.practice,
      coverage: Array.isArray(due.coverage) ? due.coverage : [],
      health: due.health ?? EMPTY_DUE.health,
      budget: due.budget ?? EMPTY_DUE.budget,
      trail: due.trail ?? EMPTY_DUE.trail,
      garden: due.garden ?? EMPTY_DUE.garden,
      commitment: due.commitment ?? EMPTY_DUE.commitment,
    },
    if_then: p?.if_then ?? "",
    streak: p?.streak ?? EMPTY_PLAN_SURFACE.streak,
    progress: {
      courses: Array.isArray(p?.progress?.courses) ? p.progress.courses : [],
      totals: p?.progress?.totals ?? EMPTY_PLAN_SURFACE.progress.totals,
    },
    evaluation: p?.evaluation && p.evaluation.ok === true ? p.evaluation : { ok: false, note: p?.evaluation?.note },
    commitment: {
      commitment: p?.commitment?.commitment ?? null,
      check_in: p?.commitment?.check_in ?? null,
      line: p?.commitment?.line ?? "",
    },
    errors: Array.isArray(p?.errors) ? p.errors : [],
  };
}

export async function setCommitment(input: {
  text: string;
  deadline: string;
  course?: string;
  linkedItemId?: string;
}): Promise<CommitmentState> {
  return invoke<CommitmentState>("set_commitment", {
    text: input.text,
    deadline: input.deadline,
    course: input.course ?? "",
    linkedItemId: input.linkedItemId ?? "",
  });
}

export async function resolveCommitment(
  status: "met" | "not_met" | "dropped"
): Promise<CommitmentState> {
  return invoke<CommitmentState>("resolve_commitment", { status });
}

export async function recordReviewOutcome(
  itemId: string,
  outcome: ReviewOutcome,
  sameSession = false
): Promise<ScoredReview> {
  return invoke<ScoredReview>("record_review_outcome", {
    itemId,
    outcome,
    sameSession,
  });
}

export async function routeIntent(trigger: string): Promise<RouteResult | null> {
  return invoke<RouteResult>("route_intent", { trigger });
}

export async function onInboxUpdated(
  handler: () => void
): Promise<UnlistenFn> {
  return listen("inbox-updated", () => handler());
}

export async function onSyncFailed(
  handler: (message: string) => void
): Promise<UnlistenFn> {
  return listen<string>("sync-failed", (event) => handler(event.payload));
}

/* ------------------------------------------------------------------ */
/* Canvas study-source sync with streamed progress (onboarding Screen 3) */

export type CourseColor = { name: string; light: string; dark: string };

export type SyncCourseSummary = {
  id: string;
  label: string;
  color_index: number;
  color: CourseColor;
  sources?: number;
  exams?: number;
  items?: number;
  counts?: { assignments: number; quizzes: number; exams: number; discussions: number; other: number };
  term_source?: string;
  errors?: number;
};

export type StudySyncEvent =
  | { event: "courses"; courses: SyncCourseSummary[] }
  | { event: "course"; ok: boolean; course: SyncCourseSummary; errors: string[] }
  | { event: "done"; ok: boolean; partial?: boolean; session: string; error?: string; errors?: string[]; courses: SyncCourseSummary[] };

/** Runs the study-source sync; resolves when it exits. Progress arrives via onStudySyncProgress. */
export async function syncStudySources(): Promise<SyncResult> {
  return invoke<SyncResult>("sync_study_sources");
}

export async function onStudySyncProgress(
  handler: (event: StudySyncEvent) => void
): Promise<UnlistenFn> {
  return listen<StudySyncEvent>("study-sync-progress", (e) => handler(e.payload));
}

/* ------------------------------------------------------------------ */
/* Home semester line (computed natively from synced schema-2 JSON)     */

export type SemesterRange = "1m" | "2m" | "3m" | "semester";

export type TickKind = "assignment" | "quiz" | "exam" | "discussion" | "other";

export type Tick = {
  id: string;
  course_id: string;
  kind: TickKind;
  title: string;
  due_at: string;
  points_possible: number | null;
  weight_share: number;
  group_name: string | null;
  html_url: string | null;
  submitted: boolean | null;
  graded: boolean | null;
  score: number | null;
  past: boolean;
  has_description: boolean;
};

export type CourseTerm = { start_at: string | null; end_at: string | null; source: "canvas" | "inferred" | "mixed" | "none" };

export type CourseRow = {
  id: string;
  label: string;
  code: string;
  color_index: number;
  color: CourseColor;
  term: CourseTerm;
  fetched_at: string | null;
  ticks: Tick[];
  undated: number;
  total_items: number;
  errors: string[];
};

export type Semester = {
  today: string;
  range: SemesterRange;
  window: { start: string; end: string };
  courses: CourseRow[];
  status: { state: "never" | "ok" | "partial" | "failed" | "session_expired"; finished_at: string | null; errors: string[] };
};

/** Local calendar date (YYYY-MM-DD) of the renderer — the window is drawn in the student's day. */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function readSemester(range: SemesterRange, today: string = localToday()): Promise<Semester> {
  return invoke<Semester>("read_semester", { range, today });
}

/* ------------------------------------------------------------------ */
/* Exam Prep                                                            */

export type ExamPrepSource = { id: string; kind: string; title: string; excerpt: string; updated_at: string | null };
export type ExamPrepFocus = { source_id: string; title: string; how: string };
export type ExamPrepDay = { date: string; weekday: string; label: string; is_today: boolean; is_review: boolean; focus: ExamPrepFocus[] };
export type ExamPrep = {
  course: { id: string; label: string; code: string; color_index: number; color: CourseColor };
  exam: {
    id: string;
    title: string;
    kind: string;
    due_at: string;
    points_possible: number | null;
    weight_share: number;
    html_url: string | null;
    description: string | null;
    syllabus_mentions: string[];
  };
  covers: ExamPrepSource[];
  plan: { seed: number; draft: boolean; method: string; note: string; days_until: number; days: ExamPrepDay[] };
};

export async function readExamPrep(courseId: string, itemId: string, seed = 0, today: string = localToday()): Promise<ExamPrep> {
  return invoke<ExamPrep>("read_exam_prep", { courseId, itemId, today, seed });
}

/* ------------------------------------------------------------------ */
/* Local calendar + email suggestions (contract; producer pending)      */

export type CalendarEventKind = "study" | "class" | "exam" | "personal";

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  title: string;
  course_id: string | null;
  color_index: number | null;
  start: string;
  end: string;
  note: string;
  created_at: string;
  source: string;
};

export type CalendarSuggestion = { source_message_id: string; title: string; start: string; end: string; confidence: number; why: string };
export type CalendarDecision = { source_message_id: string; decision: "added" | "dismissed"; at: string; event_id: string | null };
export type CalendarPayload = { events: CalendarEvent[]; suggestions: CalendarSuggestion[]; decisions: CalendarDecision[] };

export type NewCalendarEvent = {
  kind: CalendarEventKind;
  title: string;
  course_id?: string | null;
  color_index?: number | null;
  start: string;
  end: string;
  note?: string;
};

export async function readCalendar(): Promise<CalendarPayload> {
  return invoke<CalendarPayload>("read_calendar");
}

export async function addCalendarEvent(event: NewCalendarEvent): Promise<CalendarEvent> {
  return invoke<CalendarEvent>("add_calendar_event", { event });
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await invoke("delete_calendar_event", { id });
}

export async function decideCalendarSuggestion(messageId: string, decision: "added" | "dismissed"): Promise<CalendarPayload> {
  return invoke<CalendarPayload>("decide_calendar_suggestion", { messageId, decision });
}

/** Open an https link (Canvas html_url) in the system browser. */
export async function openExternal(url: string): Promise<void> {
  await invoke("open_external", { url });
}
