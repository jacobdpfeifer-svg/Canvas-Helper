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

export type DockMode = "onboarding" | "peek" | "expanded";

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
