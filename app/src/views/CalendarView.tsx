import { useCallback, useEffect, useRef, useState } from "react";
import { nearestCheckpoint, Top3Sticky } from "../components/Top3Sticky";
import { ReviewSession } from "../components/ReviewSession";
import { CommandPalette } from "../components/CommandPalette";
import { LedgerViewer } from "../components/LedgerViewer";
import { IconCommand } from "../components/Icons";
import { CommitmentCard } from "../calendar/CommitmentCard";
import { AddEventSheet } from "../calendar/AddEventSheet";
import { MonthGrid } from "../calendar/MonthGrid";
import {
  EMPTY_PLAN_SURFACE,
  addCalendarEvent,
  decideCalendarSuggestion,
  deleteCalendarEvent,
  onInboxUpdated,
  onSyncFailed,
  readCalendar,
  readPlanSurface,
  readSemester,
  resolveCommitment,
  routeIntent,
  setCommitment,
  syncCanvas,
  type CalendarPayload,
  type CourseRow,
  type DueReview,
  type NewCalendarEvent,
  type PlanSurface,
  type Top3Item,
} from "../ipc";
import type { ThemeId } from "../theme";
import { fmtDue } from "../home/ticks";

/**
 * Calendar (formerly Plan). The commitment leads, then due checks, then the
 * local calendar at the bottom. Everything the tab needs from the learning
 * side arrives in ONE IPC (read_plan_surface); the local calendar and the
 * course rows are two cheap native reads. The tab paints immediately and
 * fills in.
 */
export function CalendarView({ theme }: { theme: ThemeId }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [surface, setSurface] = useState<PlanSurface>(EMPTY_PLAN_SURFACE);
  const [surfaceReady, setSurfaceReady] = useState(false);
  const [surfaceFailed, setSurfaceFailed] = useState(false);
  const [calendar, setCalendar] = useState<CalendarPayload>({ events: [], suggestions: [], decisions: [] });
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [sessionItems, setSessionItems] = useState<DueReview[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [routeHint, setRouteHint] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState<null | { date?: string }>(null);
  const [calError, setCalError] = useState("");
  const readyRef = useRef(false);
  readyRef.current = surfaceReady;

  const refreshSurface = useCallback(() => {
    readPlanSurface()
      .then((p) => {
        setSurface(p);
        setSurfaceFailed(false);
        if (p.due.items.length === 0) setReviewOpen(false);
      })
      .catch((e) => {
        console.error("read_plan_surface failed", e);
        if (!readyRef.current) setSurfaceFailed(true);
      })
      .finally(() => setSurfaceReady(true));
  }, []);

  const refreshCalendar = useCallback(() => {
    readCalendar()
      .then(setCalendar)
      .catch((e) => setCalError(e instanceof Error ? e.message : String(e)));
  }, []);

  const refreshCourses = useCallback(() => {
    readSemester("semester")
      .then((s) => setCourses(s.courses))
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    refreshSurface();
    refreshCalendar();
    refreshCourses();
    let unlistenInbox: (() => void) | undefined;
    let unlistenSync: (() => void) | undefined;
    onInboxUpdated(() => {
      setSyncError(null);
      refreshSurface();
      refreshCourses();
    }).then((fn) => {
      unlistenInbox = fn;
    });
    onSyncFailed((message) => setSyncError(message || "Sync failed")).then((fn) => {
      unlistenSync = fn;
    });
    return () => {
      unlistenInbox?.();
      unlistenSync?.();
    };
  }, [refreshSurface, refreshCalendar, refreshCourses]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.altKey && event.code === "Space") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const { due, practice, health, budget, trail, garden } = { ...surface.due, due: surface.due };
  const dueReviews = due.items;
  const duePeek: Top3Item[] = dueReviews.slice(0, 2).map((item) => ({ id: item.id, title: item.claim, due: item.why || item.course }));
  const openWith = practice.focus_stale ? "" : (practice.open_with || "").trim();
  const recoveryLine = practice.recovery ? practice.line : "";
  const coverageLine = due.coverage.find((row) => row.state === "unextracted")?.line || (practice.state === "in_the_gap" || practice.state === "unextracted" ? practice.line : "");
  const displayTop3: Top3Item[] = surfaceFailed
    ? [{ id: "due-error", title: "Couldn’t load checks", due: "Try Sync from the command palette" }]
    : duePeek.length > 0
      ? duePeek
      : recoveryLine
        ? [{ id: "recovery", title: recoveryLine, due: "" }]
        : openWith
          ? [{ id: "open-with", title: "Open with", due: openWith }]
          : coverageLine
            ? [{ id: "practice", title: coverageLine, due: "" }]
            : [{ id: "idle", title: "No checks scheduled", due: "" }];

  const courseLabels = courses.map((c) => c.code || c.label);
  const addEvent = async (event: NewCalendarEvent) => {
    await addCalendarEvent(event);
    refreshCalendar();
  };

  return (
    <div className="plan calendar-tab">
      <header className="dock-controls">
        <h1 className="plan-heading">Calendar</h1>
        <button type="button" className="ghost icon-btn" title="Command palette (⌥Space)" aria-label="Open command palette" onClick={() => setPaletteOpen(true)}>
          <IconCommand />
        </button>
      </header>

      <CommitmentCard
        state={surface.commitment}
        courses={courseLabels}
        onSet={async (input) => {
          await setCommitment(input);
          refreshSurface();
        }}
        onResolve={async (status) => {
          await resolveCommitment(status);
          refreshSurface();
        }}
      />

      {reviewOpen && sessionItems.length > 0 ? (
        <ReviewSession
          items={sessionItems}
          onClose={() => {
            setReviewOpen(false);
            refreshSurface();
          }}
          onFinished={() => {
            setReviewOpen(false);
            setSessionItems([]);
            refreshSurface();
          }}
        />
      ) : (
        <Top3Sticky
          items={displayTop3}
          onExpand={() => setShowLedger(true)}
          dueCount={dueReviews.length}
          checkpointDue={nearestCheckpoint(dueReviews.map((item) => item.checkpoint_due))}
          ifThen={surface.if_then}
          obstacle={practice.obstacle}
          practiceLine={dueReviews.length > 0 ? practice.line : practice.counterfactual || ""}
          healthLine={health.line}
          streakLine={surface.streak.line}
          budgetLine={budget.line}
          trailLine={trail.line}
          loading={!surfaceReady}
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
      {surface.errors.length > 0 && <p className="muted small">Some sections are empty on this profile: {surface.errors.join("; ")}</p>}

      {calendar.suggestions.length > 0 && (
        <section className="retention suggested" aria-label="Suggested from email">
          <h2>Suggested from email</h2>
          <ul className="suggestion-list">
            {calendar.suggestions.map((s) => (
              <li key={s.source_message_id} className="glass suggestion">
                <div>
                  <strong>{s.title}</strong>
                  <span className="muted small">
                    {fmtDue(s.start)} → {new Date(s.end).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · {Math.round(s.confidence * 100)}% sure
                  </span>
                  <span className="muted small">{s.why}</span>
                </div>
                <div className="row">
                  <button type="button" className="primary" onClick={() => void decideCalendarSuggestion(s.source_message_id, "added").then(setCalendar).catch((e) => setCalError(String(e)))}>
                    Add
                  </button>
                  <button type="button" className="ghost" onClick={() => void decideCalendarSuggestion(s.source_message_id, "dismissed").then(setCalendar).catch((e) => setCalError(String(e)))}>
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="retention local-calendar" aria-label="Calendar">
        <div className="row between">
          <h2>Calendar</h2>
          <button type="button" className="primary" onClick={() => setAddOpen({})}>
            Add to calendar
          </button>
        </div>
        {calError && (
          <p className="error" role="alert">
            {calError}
          </p>
        )}
        <MonthGrid
          events={calendar.events}
          courses={courses}
          theme={theme}
          onDelete={(id) => void deleteCalendarEvent(id).then(refreshCalendar).catch((e) => setCalError(String(e)))}
          onPickDay={(date) => setAddOpen({ date })}
        />
      </section>

      {surfaceReady && (trail.learning.length + trail.workflow.length > 0 || garden.courses.length > 0 || surface.progress.courses.length > 0 || surface.evaluation.ok) && (
        <details className="learning-record">
          <summary>Learning record</summary>
          {trail.learning.length + trail.workflow.length > 0 && (
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
          {garden.courses.length > 0 && (
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
          {surface.progress.courses.length > 0 && (
            <section className="retention" aria-label="Retention">
              <h2>Retention</h2>
              <ul>
                {surface.progress.courses.map((row) => (
                  <li key={row.course}>
                    <strong>{row.course}</strong>
                    <span>
                      {row.fragile} fragile, {row.holding} holding, {row.durable} durable retrieval {row.durable === 1 ? "signal" : "signals"}
                    </span>
                    {row.claims?.length > 0 && <em>{row.claims.map((claim) => claim.claim).join(" · ")}</em>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {surface.evaluation.ok && surface.evaluation.before && surface.evaluation.after && surface.evaluation.deltas && (
            <section className="retention" aria-label="Evaluation compare">
              <h2>Evaluation</h2>
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
                      {surface.evaluation.before?.[key] ?? 0} → {surface.evaluation.after?.[key] ?? 0} ({surface.evaluation.deltas?.[key] ?? 0})
                    </span>
                  </li>
                ))}
              </ul>
              {surface.evaluation.note ? <p className="check-chip">{surface.evaluation.note}</p> : null}
            </section>
          )}
        </details>
      )}

      {addOpen && <AddEventSheet courses={courses} theme={theme} initialDate={addOpen.date} onClose={() => setAddOpen(null)} onAdd={addEvent} />}

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onAction={(action) => {
            setPaletteOpen(false);
            if (action === "sync") {
              setSyncError(null);
              syncCanvas()
                .then((r) => {
                  if (!r.ok) setSyncError(r.error || "Sync failed");
                  else {
                    setSyncError(null);
                    refreshSurface();
                    refreshCourses();
                  }
                })
                .catch((e) => setSyncError(String(e)));
            } else if (action === "brief") {
              routeIntent("what should I do first")
                .then((r) => {
                  if (!r) {
                    setRouteHint("Router unavailable");
                    return;
                  }
                  setRouteHint(r.skill_id ? `Routed → ${r.skill_id} (${r.method})` : r.ambiguous ? "Ambiguous — ask student" : "No skill matched");
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
