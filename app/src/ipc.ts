import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { fixtureEnabled, fixtureHealth, fixtureSemester } from "./dev/fixtures";

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

/** Native dock commands share this adapter with all other frontend IPC. */
export async function setDockMode(mode: DockMode): Promise<void> {
  if (!isTauri()) return;
  await invoke("set_dock_mode", { mode });
}

export async function showDock(): Promise<void> {
  if (!isTauri()) return;
  await invoke("show_dock");
}

export async function hideDock(): Promise<void> {
  if (!isTauri()) return;
  await invoke("hide_dock");
}

/** True when running inside the Tauri webview (not plain Vite browser). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function syncCanvas(): Promise<SyncResult> {
  if (!isTauri()) return { ok: false, error: "not in tauri" };
  return invoke<SyncResult>("sync_canvas");
}

export async function readTop3(): Promise<Top3Item[]> {
  if (!isTauri()) return [];
  return invoke<Top3Item[]>("read_top3");
}

export async function openCanvasSso(): Promise<void> {
  if (!isTauri()) return;
  await invoke("open_canvas_sso");
}

/** Headless probe: is there already a valid Canvas session in browser/.auth? */
export async function checkCanvasSession(): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>("check_canvas_session");
}

/**
 * Fire-and-forget: kick off the deep, full-term first sync as soon as
 * onboarding confirms a Canvas session. Runs in the background while the
 * student finishes the rest of the wizard — never awaited, never blocks
 * onboarding progress.
 */
export function bootstrapCanvasSync(): void {
  if (!isTauri()) return;
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
  if (!isTauri()) {
    localStorage.setItem("pn_school", schoolSlug);
    localStorage.setItem("pn_cloud_key", cloudKey);
    if (options?.priorities) {
      localStorage.setItem("pn_priorities", options.priorities);
    }
    if (options?.sentryOptIn !== undefined) {
      localStorage.setItem("pn_sentry_opt_in", options.sentryOptIn ? "1" : "0");
    }
    if (options?.waitlistEmail) {
      localStorage.setItem("pn_waitlist_email", options.waitlistEmail);
    }
    return;
  }
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
 * canvas_mcp.core.user_profile). Web preview has no USER.md to write to, so
 * it stashes the answers in localStorage for the record only. */
export async function saveUserProfile(
  identity: OnboardingIdentity
): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem("pn_user_profile", JSON.stringify(identity));
    return;
  }
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
  if (!isTauri()) {
    localStorage.setItem("pn_learning_profile", JSON.stringify(answers));
    return;
  }
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

export async function readBriefStreak(): Promise<BriefStreak> {
  if (!isTauri()) {
    return { streak: 0, last_brief_date: null, briefed_today: false, line: "" };
  }
  const payload = await invoke<BriefStreak>("read_brief_streak");
  return {
    streak: payload?.streak ?? 0,
    last_brief_date: payload?.last_brief_date ?? null,
    briefed_today: Boolean(payload?.briefed_today),
    line: payload?.line ?? "",
  };
}

export async function readLearnProgress(): Promise<LearnProgress> {
  if (!isTauri()) {
    return {
      courses: [],
      totals: { fragile: 0, holding: 0, durable: 0, total: 0 },
    };
  }
  const payload = await invoke<LearnProgress>("read_learn_progress");
  return {
    courses: Array.isArray(payload?.courses) ? payload.courses : [],
    totals: payload?.totals ?? { fragile: 0, holding: 0, durable: 0, total: 0 },
  };
}

const EMPTY_BUDGET: ReviewBudget = {
  now: 0,
  later: 0,
  later_checkpoint: null,
  line: "",
};

const EMPTY_TRAIL: Trail = { line: "", learning: [], workflow: [] };

const EMPTY_GARDEN: Garden = { note: "", courses: [] };

const EMPTY_COMMITMENT: CommitmentState = {
  commitment: null,
  check_in: null,
  line: "",
};

const EMPTY_HEALTH: KnowledgeHealth = {
  fragile: 0,
  holding: 0,
  durable: 0,
  attempt_only: 0,
  delayed_hit_signal: 0,
  next_review_at: null,
  next_checkpoint_due: null,
  line: "",
};

export async function readDueReviews(): Promise<DueReviewsPayload> {
  const empty: DueReviewsPayload = {
    items: [],
    practice: { state: "idle", line: "", obstacle: "", open_with: "" },
    coverage: [],
    health: EMPTY_HEALTH,
    budget: EMPTY_BUDGET,
    trail: EMPTY_TRAIL,
    garden: EMPTY_GARDEN,
    commitment: EMPTY_COMMITMENT,
  };
  if (!isTauri()) return empty;
  const payload = await invoke<{
    items?: DueReview[];
    practice?: PracticeSurface;
    coverage?: CoverageRow[];
    health?: KnowledgeHealth;
    budget?: ReviewBudget;
    trail?: Trail;
    garden?: Garden;
    commitment?: CommitmentState;
  }>("read_due_reviews");
  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    practice: payload?.practice ?? empty.practice,
    coverage: Array.isArray(payload?.coverage) ? payload.coverage : [],
    health: payload?.health ?? empty.health,
    budget: payload?.budget ?? empty.budget,
    trail: payload?.trail ?? empty.trail,
    garden: payload?.garden ?? empty.garden,
    commitment: payload?.commitment ?? empty.commitment,
  };
}

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

const EMPTY_COMPARE: EvaluationCompare = { ok: false };

export async function readEvaluationCompare(): Promise<EvaluationCompare> {
  if (!isTauri()) return EMPTY_COMPARE;
  try {
    const payload = await invoke<EvaluationCompare>("read_evaluation_compare");
    if (!payload || payload.ok !== true) return { ok: false, note: payload?.note };
    return payload;
  } catch {
    return EMPTY_COMPARE;
  }
}

export async function readCommitment(): Promise<CommitmentState> {
  if (!isTauri()) return EMPTY_COMMITMENT;
  try {
    const payload = await invoke<CommitmentState>("read_commitment");
    return {
      commitment: payload?.commitment ?? null,
      check_in: payload?.check_in ?? null,
      line: payload?.line ?? "",
    };
  } catch {
    return EMPTY_COMMITMENT;
  }
}

export async function setCommitment(input: {
  text: string;
  deadline: string;
  course?: string;
  linkedItemId?: string;
}): Promise<CommitmentState> {
  if (!isTauri()) {
    throw new Error("not in tauri");
  }
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
  if (!isTauri()) {
    throw new Error("not in tauri");
  }
  return invoke<CommitmentState>("resolve_commitment", { status });
}

export async function recordReviewOutcome(
  itemId: string,
  outcome: ReviewOutcome,
  sameSession = false
): Promise<ScoredReview> {
  if (!isTauri()) {
    throw new Error("not in tauri");
  }
  return invoke<ScoredReview>("record_review_outcome", {
    itemId,
    outcome,
    sameSession,
  });
}

export async function readCheckIntention(): Promise<string> {
  if (!isTauri()) {
    try {
      const raw = localStorage.getItem("pn_learning_profile");
      if (!raw) return "";
      const parsed = JSON.parse(raw) as { ifThen?: string };
      return parsed.ifThen ?? "";
    } catch {
      return "";
    }
  }
  return invoke<string>("read_check_intention");
}

export async function routeIntent(trigger: string): Promise<RouteResult | null> {
  if (!isTauri()) return null;
  return invoke<RouteResult>("route_intent", { trigger });
}

export async function onInboxUpdated(
  handler: () => void
): Promise<UnlistenFn | (() => void)> {
  if (!isTauri()) return () => undefined;
  return listen("inbox-updated", () => handler());
}

export async function onSyncFailed(
  handler: (message: string) => void
): Promise<UnlistenFn | (() => void)> {
  if (!isTauri()) return () => undefined;
  return listen<string>("sync-failed", (event) => handler(event.payload));
}

export type SemesterTick = {
  id: string;
  course_id: string;
  course_label: string;
  color: string;
  title: string;
  kind: string;
  due_at: string | null;
  points_possible: number | null;
  weight_share: number;
  html_url: string | null;
  completed: boolean;
  description: string;
};

export type SemesterCourse = {
  id: string;
  label: string;
  code: string;
  name: string;
  color: string;
  term: { start_at: string | null; end_at: string | null; source: string };
  ticks: SemesterTick[];
  counts: { assignments: number; quizzes: number; exams: number };
};

export type SemesterSurface = {
  courses: SemesterCourse[];
  range: string;
  window_start: string;
  window_end: string;
  today: string;
};

export async function readSemester(range: string, today: string): Promise<SemesterSurface> {
  if (!isTauri()) {
    if (fixtureEnabled()) return fixtureSemester(range);
    return { courses: [], range, window_start: today, window_end: today, today };
  }
  return invoke<SemesterSurface>("read_semester", { range, today });
}

export type SyncProgressCourse = {
  id: string;
  label: string;
  color?: string;
  assignments?: number;
  quizzes?: number;
  exam_count?: number;
  ok?: boolean;
};

export type SyncProgress = {
  phase: string;
  courses: SyncProgressCourse[];
  error?: string | null;
};

export async function readSyncProgress(): Promise<SyncProgress> {
  if (!isTauri()) return { phase: "idle", courses: [] };
  return invoke<SyncProgress>("read_sync_progress");
}

export async function onStudySyncProgress(
  handler: (progress: SyncProgress) => void
): Promise<UnlistenFn | (() => void)> {
  if (!isTauri()) return () => undefined;
  return listen<SyncProgress>("study-sync-progress", (event) => handler(event.payload));
}

export async function syncStudySourcesIpc(): Promise<SyncResult> {
  if (!isTauri()) return { ok: false, error: "Canvas sync needs the desktop app" };
  return invoke<SyncResult>("sync_study_sources");
}

export type CalendarEvent = {
  id: string;
  kind: string;
  title: string;
  start: string;
  end: string;
  course_id?: string | null;
  color?: string | null;
  note?: string | null;
};

export type CalendarSuggestion = {
  source_message_id: string;
  title: string;
  start: string;
  end: string;
  confidence: number;
  why: string;
};

export type CalendarSurface = {
  events: CalendarEvent[];
  canvas_events?: CalendarEvent[];
  suggestions: CalendarSuggestion[];
  commitment: CommitmentState;
  sync_health?: SyncHealth;
};

export async function readCalendarSurface(): Promise<CalendarSurface> {
  const empty: CalendarSurface = {
    events: [],
    canvas_events: [],
    suggestions: [],
    commitment: EMPTY_COMMITMENT,
  };
  if (!isTauri()) return empty;
  try {
    const payload = await invoke<CalendarSurface>("read_calendar_surface");
    return {
      events: payload?.events ?? [],
      canvas_events: payload?.canvas_events ?? [],
      suggestions: payload?.suggestions ?? [],
      commitment: payload?.commitment ?? EMPTY_COMMITMENT,
      sync_health: payload?.sync_health,
    };
  } catch {
    return empty;
  }
}

export async function addCalendarEvent(event: Omit<CalendarEvent, "id"> & { id?: string }): Promise<CalendarEvent> {
  if (!isTauri()) {
    const row: CalendarEvent = {
      id: event.id || `cal-${Date.now()}`,
      kind: event.kind,
      title: event.title,
      start: event.start,
      end: event.end,
      course_id: event.course_id,
      color: event.color,
      note: event.note,
    };
    const key = "pn_calendar_local";
    const prev = JSON.parse(localStorage.getItem(key) || "[]") as CalendarEvent[];
    prev.push(row);
    localStorage.setItem(key, JSON.stringify(prev));
    return row;
  }
  return invoke<CalendarEvent>("add_calendar_event", { event });
}

export async function dismissCalendarSuggestion(sourceMessageId: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("dismiss_calendar_suggestion", { sourceMessageId });
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  await invoke("open_external_url", { url });
}

export type SyncHealth = {
  state?: string;
  sync_id?: string | null;
  as_of?: string | null;
  surfaces_enabled?: boolean;
  empty_means?: string;
  inspect_in_canvas?: boolean;
  failed_endpoints?: unknown[];
  named_courses_failed?: string[];
  truncated?: string[];
  timezone?: string;
};

export type WorkItem = {
  id: string;
  course_id: string;
  canvas_id: string;
  title: string;
  effective_due_at?: string | null;
  submission_state?: string;
  html_url?: string | null;
  seen_in?: string[];
  disagreements?: { field: string; values: string[] }[];
  lti?: boolean;
  course_name?: string | null;
  course_code?: string | null;
};

export type WorkSurface = {
  sync_id?: string;
  health_state?: string;
  as_of?: string;
  items?: WorkItem[];
  buckets?: Record<string, WorkItem[]>;
  empty_means?: string;
};

export type CourseMap = {
  sync_id?: string;
  health_state?: string;
  as_of?: string;
  fallback_reason?: string | null;
  course?: { id: string; code?: string; name?: string; label?: string; color?: string; html_url?: string | null };
  start_here?: { kind: string; title: string; html_url?: string | null }[];
  learn?: { id: string; title: string; html_url?: string | null; locked?: boolean; lti?: boolean }[];
  do?: WorkItem[];
  check?: { missing?: WorkItem[]; unsubmitted?: WorkItem[]; grade?: GradeTruth };
};

export type GradeScenario = {
  status: string;
  scenario: string;
  percent: number | null;
  letter?: string | null;
  included_item_ids?: string[];
  excluded_item_ids?: string[];
  warnings?: { code: string; item_ids?: string[] }[];
  as_of?: string;
};

export type GradeTruth = {
  course_id?: string;
  as_of?: string;
  canvas_reported?: GradeScenario;
  graded_only?: GradeScenario;
  risk_adjusted?: GradeScenario;
  what_if?: GradeScenario;
  lead?: {
    canvas_says?: number | null;
    canvas_letter?: string | null;
    unsubmitted_due_count?: number;
    risk?: number | null;
    why?: string;
  };
};

export async function readSyncHealth(): Promise<SyncHealth> {
  if (!isTauri()) return fixtureEnabled() ? fixtureHealth() : { state: "empty_unverified", surfaces_enabled: false };
  return invoke<SyncHealth>("read_sync_health");
}

export async function readWorkSurface(filters: Record<string, string> = {}): Promise<WorkSurface> {
  if (!isTauri()) return { items: [], buckets: {} };
  return invoke<WorkSurface>("read_work_surface", { filters });
}

export async function readCourseMap(courseId: string): Promise<CourseMap> {
  if (!isTauri()) return { course: { id: courseId } };
  return invoke<CourseMap>("read_course_map", { courseId });
}

export async function readGradeTruth(courseId: string): Promise<GradeTruth> {
  if (!isTauri()) return { course_id: courseId };
  return invoke<GradeTruth>("read_grade_truth", { courseId });
}

