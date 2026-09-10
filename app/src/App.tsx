import { useEffect, useState } from "react";
import { nearestCheckpoint, Top3Sticky } from "./components/Top3Sticky";
import { CommitmentPanel } from "./components/Commitment";
import { ReviewSession } from "./components/ReviewSession";
import { NarrateAfter } from "./components/NarrateAfter";
import { CommandPalette } from "./components/CommandPalette";
import { ApprovalSheet } from "./components/ApprovalSheet";
import { Onboarding } from "./components/Onboarding";
import { LedgerViewer } from "./components/LedgerViewer";
import {
  hideDock,
  onInboxUpdated,
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

export function App() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem("pn_onboarded") === "1"
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [approval, setApproval] = useState<null | {
    title: string;
    why: string;
  }>(null);
  const [showLedger, setShowLedger] = useState(false);
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

  const expanded = paletteOpen || approval !== null || showLedger || reviewOpen;

  const refreshTop3 = () => {
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
      });
    readCheckIntention()
      .then(setIfThen)
      .catch((e) => console.error("read_check_intention failed", e));
    readBriefStreak()
      .then((payload) => setStreakLine(payload.line || ""))
      .catch((e) => {
        console.error("read_brief_streak failed", e);
        setStreakLine("");
      });
    readLearnProgress()
      .then((payload) => setProgress(payload.courses))
      .catch((e) => {
        console.error("read_learn_progress failed", e);
        setProgress([]);
      });
    readEvaluationCompare()
      .then(setEvalCompare)
      .catch(() => setEvalCompare({ ok: false }));
    readCommitment()
      .then(setCommitmentState)
      .catch(() =>
        setCommitmentState({ commitment: null, check_in: null, line: "" })
      );
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
    let unlisten: (() => void) | undefined;
    onInboxUpdated(() => refreshTop3()).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
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
    ? []
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
          className="ghost"
          title="Command palette (⌥Space)"
          onClick={() => setPaletteOpen(true)}
        >
          ⌥
        </button>
        <button
          type="button"
          className="ghost stop"
          title="STOP all automation for 24h"
          onClick={() => window.alert("STOP engaged 24h")}
        >
          STOP
        </button>
        <button
          type="button"
          className="ghost dismiss"
          title="Hide"
          onClick={() => hideDock()}
        >
          ×
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
          onStartCheck={() => {
            setSessionItems(dueReviews);
            setReviewOpen(true);
          }}
        />
      )}
      {routeHint && <p className="route-hint">{routeHint}</p>}

      {expanded && trail.learning.length + trail.workflow.length > 0 && (
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

      {expanded && garden.courses.length > 0 && (
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

      {expanded && progress.length > 0 && (
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

      {expanded && evalCompare.ok && evalCompare.before && evalCompare.after && evalCompare.deltas && (
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

      {expanded && (
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

      {expanded && (
        <NarrateAfter
          items={[
            {
              id: "n1",
              text: "Moved Wednesday study block because your flight changed",
              why: "calendar sync detected conflict",
            },
            {
              id: "n2",
              text: "Drafted email to professor — saved to Drafts",
              why: "inbox triage matched office-hours template",
            },
          ]}
          onUndo={(id) => console.log("undo", id)}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onAction={(action) => {
            setPaletteOpen(false);
            if (action === "approve-demo") {
              setApproval({
                title: "Submit assignment preview",
                why: "Course calibrated; mechanical busywork",
              });
            } else if (action === "sync") {
              syncCanvas()
                .then((r) => {
                  if (!r.ok) {
                    console.error("sync failed", r.error);
                    window.alert(r.error || "Sync failed");
                  } else {
                    refreshTop3();
                  }
                })
                .catch((e) => {
                  console.error(e);
                  window.alert(String(e));
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

      {approval && (
        <ApprovalSheet
          title={approval.title}
          why={approval.why}
          onApprove={() => setApproval(null)}
          onSkip={() => setApproval(null)}
        />
      )}

      {showLedger && <LedgerViewer onClose={() => setShowLedger(false)} />}
    </div>
  );
}
