import { useEffect, useRef, useState } from "react";
import { nearestCheckpoint, Top3Sticky } from "./components/Top3Sticky";
import { CommitmentPanel } from "./components/Commitment";
import { ReviewSession } from "./components/ReviewSession";
import { CommandPalette } from "./components/CommandPalette";
import { Onboarding } from "./components/Onboarding";
import { LedgerViewer } from "./components/LedgerViewer";
import { IconClose, IconCommand } from "./components/Icons";
import { Skeleton } from "./components/Skeleton";
import {
  hideDock,
  onInboxUpdated,
  onSyncFailed,
  readBriefStreak,
  readCheckIntention,
  readCommitment,
  readDueReviews,
  readEvaluationCompare,
  readLearnProgress,
  resolveCommitment,
  routeIntent,
  setCommitment,
  setDockMode,
  showDock,
  syncCanvas,
  type CommitmentState,
  type CourseProgress,
  type EvaluationCompare,
  type CoverageRow,
  type DueReview,
  type Garden,
  type KnowledgeHealth,
  type PracticeSurface,
  type ReviewBudget,
  type Top3Item,
  type Trail,
} from "./ipc";

function RetentionSkeletonRows({ count = 2 }: { count?: number }) {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="retention-skeleton-row">
          <Skeleton className="skeleton-line" width={i === 0 ? "34%" : "42%"} />
          <Skeleton className="skeleton-line-sm" width={i === 0 ? "72%" : "58%"} />
        </li>
      ))}
    </ul>
  );
}

const forceSkeleton =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("force_skeleton");

export function App() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem("pn_onboarded") === "1"
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dueReviews, setDueReviews] = useState<DueReview[]>([]);
  const [sessionItems, setSessionItems] = useState<DueReview[]>([]);
  const [practice, setPractice] = useState<PracticeSurface>({
    state: "idle",
    line: "",
    obstacle: "",
    open_with: "",
    recovery: false,
    focus_stale: false,
  });
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [health, setHealth] = useState<KnowledgeHealth>({
    fragile: 0,
    holding: 0,
    durable: 0,
    attempt_only: 0,
    delayed_hit_signal: 0,
    next_review_at: null,
    next_checkpoint_due: null,
    line: "",
  });
  const [ifThen, setIfThen] = useState("");
  const [streakLine, setStreakLine] = useState("");
  const [budget, setBudget] = useState<ReviewBudget>({
    now: 0,
    later: 0,
    later_checkpoint: null,
    line: "",
  });
  const [trail, setTrail] = useState<Trail>({ line: "", learning: [], workflow: [] });
  const [garden, setGarden] = useState<Garden>({ note: "", courses: [] });
  const [commitment, setCommitmentState] = useState<CommitmentState>({
    commitment: null,
    check_in: null,
    line: "",
  });
  const [evalCompare, setEvalCompare] = useState<EvaluationCompare>({ ok: false });
  const [dueLoadFailed, setDueLoadFailed] = useState(false);
  const [progress, setProgress] = useState<CourseProgress[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [routeHint, setRouteHint] = useState<string | null>(null);

  const [dueReady, setDueReady] = useState(false);
  const [progressReady, setProgressReady] = useState(false);
  const [commitmentReady, setCommitmentReady] = useState(false);
  const [evalReady, setEvalReady] = useState(false);
  const [updating, setUpdating] = useState(false);

  const dueReadyRef = useRef(false);
  const progressReadyRef = useRef(false);
  const commitmentReadyRef = useRef(false);
  const evalReadyRef = useRef(false);
  dueReadyRef.current = dueReady;
  progressReadyRef.current = progressReady;
  commitmentReadyRef.current = commitmentReady;
  evalReadyRef.current = evalReady;

  const expanded = paletteOpen || showLedger || reviewOpen;

  const refreshTop3 = () => {
    const isRefetch = dueReadyRef.current;
    if (isRefetch) setUpdating(true);

    readDueReviews()
      .then((payload) => {
        setDueLoadFailed(false);
        setDueReviews(payload.items);
        setPractice(payload.practice);
        setCoverage(payload.coverage);
        setHealth(payload.health);
        setBudget(payload.budget);
        setTrail(payload.trail);
        setGarden(payload.garden);
        if (payload.items.length === 0) setReviewOpen(false);
      })
      .catch((e) => {
        console.error("read_due_reviews failed", e);
        // First load: clear to idle/error empty. Refetch: keep stale data.
        if (dueReadyRef.current) return;
        setDueLoadFailed(true);
        setDueReviews([]);
        setSessionItems([]);
        setReviewOpen(false);
        setPractice({
          state: "idle",
          line: "",
          obstacle: "",
          open_with: "",
          recovery: false,
          focus_stale: false,
        });
        setCoverage([]);
        setHealth({
          fragile: 0,
          holding: 0,
          durable: 0,
          attempt_only: 0,
          delayed_hit_signal: 0,
          next_review_at: null,
          next_checkpoint_due: null,
          line: "",
        });
        setBudget({ now: 0, later: 0, later_checkpoint: null, line: "" });
        setTrail({ line: "", learning: [], workflow: [] });
        setGarden({ note: "", courses: [] });
      })
      .finally(() => {
        setDueReady(true);
        setUpdating(false);
      });
    readCheckIntention()
      .then(setIfThen)
      .catch((e) => console.error("read_check_intention failed", e));
    readBriefStreak()
      .then((payload) => setStreakLine(payload.line || ""))
      .catch((e) => {
        console.error("read_brief_streak failed", e);
        if (!dueReadyRef.current) setStreakLine("");
      });
    readLearnProgress()
      .then((payload) => setProgress(payload.courses))
      .catch((e) => {
        console.error("read_learn_progress failed", e);
        if (!progressReadyRef.current) setProgress([]);
      })
      .finally(() => setProgressReady(true));
    readEvaluationCompare()
      .then(setEvalCompare)
      .catch(() => {
        if (!evalReadyRef.current) setEvalCompare({ ok: false });
      })
      .finally(() => setEvalReady(true));
    readCommitment()
      .then(setCommitmentState)
      .catch(() => {
        if (!commitmentReadyRef.current) {
          setCommitmentState({ commitment: null, check_in: null, line: "" });
        }
      })
      .finally(() => setCommitmentReady(true));
  };

  useEffect(() => {
    if (!onboarded) {
      setDockMode("onboarding");
      return;
    }
    setDockMode(expanded ? "expanded" : "peek");
  }, [onboarded, expanded]);

  useEffect(() => {
    if (onboarded) showDock();
  }, [onboarded]);

  useEffect(() => {
    if (!onboarded) return;
    refreshTop3();
    let unlistenInbox: (() => void) | undefined;
    let unlistenSync: (() => void) | undefined;
    onInboxUpdated(() => {
      setSyncError(null);
      refreshTop3();
    }).then((fn) => {
      unlistenInbox = fn;
    });
    onSyncFailed((message) => {
      setSyncError(message || "Sync failed");
    }).then((fn) => {
      unlistenSync = fn;
    });
    return () => {
      unlistenInbox?.();
      unlistenSync?.();
    };
  }, [onboarded]);

  if (!onboarded) {
    return (
      <Onboarding
        onDone={() => {
          localStorage.setItem("pn_onboarded", "1");
          setOnboarded(true);
        }}
      />
    );
  }

  const duePeek: Top3Item[] = dueReviews.slice(0, 2).map((item) => ({
    id: item.id,
    title: item.claim,
    due: item.why || item.course,
  }));
  const openWith = practice.focus_stale ? "" : (practice.open_with || "").trim();
  const recoveryLine = practice.recovery ? practice.line : "";
  const coverageLine =
    coverage.find((row) => row.state === "unextracted")?.line ||
    (practice.state === "in_the_gap" || practice.state === "unextracted"
      ? practice.line
      : "");
  const displayTop3 = dueLoadFailed
    ? [
        {
          id: "due-error",
          title: "Couldn’t load checks",
          due: "Try Sync from the command palette",
        },
      ]
    : duePeek.length > 0
      ? duePeek
      : recoveryLine
        ? [{ id: "recovery", title: recoveryLine, due: "" }]
        : openWith
          ? [{ id: "open-with", title: "Open with", due: openWith }]
          : coverageLine
            ? [{ id: "practice", title: coverageLine, due: "" }]
            : [
                {
                  id: "idle",
                  title: "No checks scheduled",
                  due: "",
                },
              ];

  return (
    <div className={`dock ${expanded ? "dock-expanded" : "dock-peek"}`}>
      <header className="dock-controls">
        <button
          type="button"
          className="ghost icon-btn"
          title="Command palette (⌥Space)"
          aria-label="Open command palette"
          onClick={() => setPaletteOpen(true)}
        >
          <IconCommand />
        </button>
        <button
          type="button"
          className="ghost dismiss icon-btn"
          title="Hide"
          aria-label="Hide dock"
          onClick={() => hideDock()}
        >
          <IconClose />
        </button>
      </header>

      {reviewOpen && sessionItems.length > 0 ? (
        <ReviewSession
          items={sessionItems}
          onClose={() => {
            setReviewOpen(false);
            refreshTop3();
          }}
          onFinished={() => {
            setReviewOpen(false);
            setSessionItems([]);
            refreshTop3();
          }}
        />
      ) : (
        <Top3Sticky
          items={displayTop3}
          onExpand={() => setShowLedger(true)}
          dueCount={dueReviews.length}
          checkpointDue={nearestCheckpoint(
            dueReviews.map((item) => item.checkpoint_due)
          )}
          ifThen={ifThen}
          obstacle={practice.obstacle}
          practiceLine={
            dueReviews.length > 0
              ? practice.line
              : practice.counterfactual || ""
          }
          healthLine={health.line}
          streakLine={streakLine}
          budgetLine={budget.line}
          trailLine={trail.line}
          loading={!dueReady || forceSkeleton}
          updating={updating && !forceSkeleton}
          onStartCheck={() => {
            setSessionItems(dueReviews);
            setReviewOpen(true);
          }}
        />
      )}
      {routeHint && <p className="route-hint">{routeHint}</p>}
      {syncError && (
        <p className="route-hint" role="alert">
          Sync failed: {syncError}
        </p>
      )}

      {expanded && (!dueReady || forceSkeleton) && (
        <section className="retention" aria-label="Trail" aria-busy="true">
          <h2>This week</h2>
          <RetentionSkeletonRows count={3} />
        </section>
      )}
      {expanded && dueReady && !forceSkeleton && trail.learning.length + trail.workflow.length > 0 && (
        <section className="retention" aria-label="Trail">
          <h2>This week</h2>
          <ul>
            {trail.learning.map((event) => (
              <li key={`${event.ts}-${event.ref}-learn`}>
                <strong>{event.course || "Learning"}</strong>
                <span>{event.label}</span>
              </li>
            ))}
            {trail.workflow.map((event) => (
              <li key={`${event.ts}-${event.label}-path`}>
                <strong>Path</strong>
                <span>{event.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {expanded && (!dueReady || forceSkeleton) && (
        <section className="retention" aria-label="Semester garden" aria-busy="true">
          <h2>Garden</h2>
          <RetentionSkeletonRows count={2} />
        </section>
      )}
      {expanded && dueReady && !forceSkeleton && garden.courses.length > 0 && (
        <section className="retention" aria-label="Semester garden">
          <h2>Garden</h2>
          {garden.note ? <p className="check-chip">{garden.note}</p> : null}
          <ul>
            {garden.courses.map((row) => (
              <li key={row.course}>
                <strong>{row.course}</strong>
                <span>{row.line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {expanded && (!progressReady || forceSkeleton) && (
        <section className="retention" aria-label="Retention" aria-busy="true">
          <h2>Retention</h2>
          <RetentionSkeletonRows count={2} />
        </section>
      )}
      {expanded && progressReady && !forceSkeleton && progress.length > 0 && (
        <section className="retention" aria-label="Retention">
          <h2>Retention</h2>
          <ul>
            {progress.map((row) => (
              <li key={row.course}>
                <strong>{row.course}</strong>
                <span>
                  {row.fragile} fragile, {row.holding} holding,{" "}
                  {row.durable} durable retrieval{" "}
                  {row.durable === 1 ? "signal" : "signals"}
                </span>
                {row.claims?.length > 0 && (
                  <em>
                    {row.claims.map((claim) => claim.claim).join(" · ")}
                  </em>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {expanded &&
        evalReady &&
        !forceSkeleton &&
        evalCompare.ok &&
        evalCompare.before &&
        evalCompare.after &&
        evalCompare.deltas && (
        <section className="retention" aria-label="Evaluation compare">
          <h2>Retention</h2>
          <ul>
            {(
              [
                ["delayed_reviews_open", "Delayed reviews open"],
                ["delayed_hit_signal", "Delayed-hit signal"],
                ["overdue_work", "Overdue work"],
                ["deadline_surprises", "Deadline surprises"],
              ] as const
            ).map(([key, label]) => (
              <li key={key}>
                <strong>{label}</strong>
                <span>
                  {evalCompare.before?.[key] ?? 0} → {evalCompare.after?.[key] ?? 0}{" "}
                  ({evalCompare.deltas?.[key] ?? 0})
                </span>
              </li>
            ))}
          </ul>
          {evalCompare.note ? <p className="check-chip">{evalCompare.note}</p> : null}
        </section>
      )}

      {expanded && (!commitmentReady || forceSkeleton) && (
        <section className="retention" aria-label="Commitment" aria-busy="true">
          <h2>Commitment</h2>
          <Skeleton className="skeleton-line" width="88%" />
          <Skeleton className="skeleton-line-sm" width="55%" />
        </section>
      )}
      {expanded && commitmentReady && !forceSkeleton && (
        <CommitmentPanel
          state={commitment}
          onSet={async (input) => {
            await setCommitment(input);
            refreshTop3();
          }}
          onResolve={async (status) => {
            await resolveCommitment(status);
            refreshTop3();
          }}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onAction={(action) => {
            setPaletteOpen(false);
            if (action === "sync") {
              setSyncError(null);
              syncCanvas()
                .then((r) => {
                  if (!r.ok) {
                    console.error("sync failed", r.error);
                    setSyncError(r.error || "Sync failed");
                  } else {
                    setSyncError(null);
                    refreshTop3();
                  }
                })
                .catch((e) => {
                  console.error(e);
                  setSyncError(String(e));
                });
            } else if (action === "brief") {
              routeIntent("what should I do first")
                .then((r) => {
                  if (!r) {
                    setRouteHint("Router unavailable outside Tauri");
                    return;
                  }
                  setRouteHint(
                    r.skill_id
                      ? `Routed → ${r.skill_id} (${r.method})`
                      : r.ambiguous
                        ? "Ambiguous — ask student"
                        : "No skill matched"
                  );
                })
                .catch((e) => console.error("route_intent failed", e));
            }
          }}
        />
      )}

      {showLedger && <LedgerViewer onClose={() => setShowLedger(false)} />}
    </div>
  );
}
