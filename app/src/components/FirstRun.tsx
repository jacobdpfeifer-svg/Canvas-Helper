import { useCallback, useEffect, useRef, useState } from "react";
import { checkCanvasSession, onStudySyncProgress, openCanvasSso, saveOnboarding, syncStudySources, type StudySyncEvent, type SyncCourseSummary } from "../ipc";
import { courseHex, currentTheme } from "../theme";
import { CanvasAnimation } from "./CanvasAnimation";
import { TermsSheet } from "./TermsSheet";

type Screen = "school" | "connect" | "syncing" | "waitlist";

type SyncRow = SyncCourseSummary & { state: "pending" | "done" | "failed" };

/**
 * First run, "show don't tell": School + Accept → Connect Canvas (mandatory)
 * → Syncing (courses land one by one) → Home. No explanatory paragraphs.
 * Desktop-only: there is no way past Connect without a Canvas session.
 */
export function FirstRun({ onDone }: { onDone: () => void }) {
  const [screen, setScreen] = useState<Screen>("school");
  const [school, setSchool] = useState("cu-boulder");
  const [accepted, setAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [screen]);

  return (
    <div className={`onboarding first-run screen-${screen}`}>
      <p className="brand-mark" aria-hidden="true">
        PN
      </p>
      {screen === "school" && (
        <SchoolScreen
          school={school}
          accepted={accepted}
          heading={heading}
          onSchool={setSchool}
          onToggleAccept={() => setAccepted((a) => !a)}
          onViewTerms={() => setTermsOpen(true)}
          onContinue={() => setScreen(school === "waitlist" ? "waitlist" : "connect")}
        />
      )}
      {screen === "connect" && <ConnectScreen heading={heading} onConnected={() => setScreen("syncing")} />}
      {screen === "syncing" && (
        <SyncingScreen
          heading={heading}
          school={school}
          onSessionLost={() => setScreen("connect")}
          onDone={onDone}
        />
      )}
      {screen === "waitlist" && <WaitlistScreen heading={heading} />}
      {termsOpen && <TermsSheet school={school} onClose={() => setTermsOpen(false)} />}
    </div>
  );
}

function SchoolScreen({
  school,
  accepted,
  heading,
  onSchool,
  onToggleAccept,
  onViewTerms,
  onContinue,
}: {
  school: string;
  accepted: boolean;
  heading: React.MutableRefObject<HTMLHeadingElement | null>;
  onSchool: (s: string) => void;
  onToggleAccept: () => void;
  onViewTerms: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="ob-screen ob-school">
      <h1 ref={heading} tabIndex={-1}>
        Your school
      </h1>
      <label htmlFor="school" className="visually-hidden">
        School
      </label>
      <select id="school" value={school} onChange={(e) => onSchool(e.target.value)}>
        <option value="cu-boulder">CU Boulder</option>
        <option value="waitlist">Somewhere else (waitlist)</option>
      </select>
      <button type="button" className="link terms-link" onClick={onViewTerms}>
        View terms
      </button>
      <div className="ob-buttons">
        <button type="button" className={`accept-toggle${accepted ? " on" : ""}`} role="checkbox" aria-checked={accepted} onClick={onToggleAccept}>
          <span className="accept-box" aria-hidden="true">
            {accepted ? "✓" : ""}
          </span>
          {accepted ? "Terms accepted" : "Accept terms"}
        </button>
        <button type="button" className="primary" disabled={!accepted} onClick={onContinue}>
          Continue
        </button>
      </div>
    </section>
  );
}

function ConnectScreen({ heading, onConnected }: { heading: React.MutableRefObject<HTMLHeadingElement | null>; onConnected: () => void }) {
  const [phase, setPhase] = useState<"checking" | "idle" | "busy" | "found" | "failed">("checking");
  const [reason, setReason] = useState("");

  // Returning device: an existing session skips sign-in, visibly.
  useEffect(() => {
    let cancelled = false;
    checkCanvasSession()
      .then((ok) => {
        if (cancelled) return;
        if (ok) {
          setPhase("found");
          window.setTimeout(() => {
            if (!cancelled) onConnected();
          }, 900);
        } else setPhase("idle");
      })
      .catch(() => {
        if (!cancelled) setPhase("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [onConnected]);

  const signIn = async () => {
    setPhase("busy");
    setReason("");
    try {
      await openCanvasSso();
    } catch (e) {
      setPhase("failed");
      setReason(describe(e));
      return;
    }
    try {
      const ok = await checkCanvasSession();
      if (ok) {
        setPhase("found");
        window.setTimeout(onConnected, 600);
      } else {
        setPhase("failed");
        setReason("No Canvas session found — the login window closed before sign-in finished.");
      }
    } catch (e) {
      setPhase("failed");
      setReason(describe(e));
    }
  };

  return (
    <section className="ob-screen ob-connect">
      <h1 ref={heading} tabIndex={-1}>
        Connect Canvas
      </h1>
      <CanvasAnimation state={phase === "busy" ? "busy" : phase === "found" ? "done" : "idle"} />
      <div className="ob-buttons">
        {phase === "found" ? (
          <p className="ob-status" role="status">
            Already signed in
          </p>
        ) : (
          <>
            {phase === "failed" && (
              <p className="ob-error" role="alert">
                {reason}
              </p>
            )}
            <button type="button" className="primary" disabled={phase === "busy" || phase === "checking"} onClick={() => void signIn()}>
              {phase === "busy" ? "Waiting for sign-in…" : phase === "failed" ? "Try again" : "Sign in to Canvas"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function describe(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/exited with|closed/i.test(msg)) return "The login window closed before sign-in finished.";
  if (/network|ENOTFOUND|ECONN|timeout/i.test(msg)) return "Couldn’t reach Canvas — check your connection.";
  if (/Node runtime|sync script/i.test(msg)) return "This install is missing its sign-in helper.";
  return msg || "Sign-in didn’t complete.";
}

function SyncingScreen({
  heading,
  school,
  onSessionLost,
  onDone,
}: {
  heading: React.MutableRefObject<HTMLHeadingElement | null>;
  school: string;
  onSessionLost: () => void;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<SyncRow[]>([]);
  const [finished, setFinished] = useState<null | { ok: boolean; error?: string }>(null);
  const [attempt, setAttempt] = useState(0);
  const theme = currentTheme();

  const handle = useCallback((ev: StudySyncEvent) => {
    if (ev.event === "courses") {
      setRows(ev.courses.map((c) => ({ ...c, state: "pending" })));
    } else if (ev.event === "course") {
      setRows((prev) => {
        const next = prev.filter((r) => r.id !== ev.course.id);
        const row: SyncRow = { ...ev.course, state: ev.ok ? "done" : "failed" };
        const idx = prev.findIndex((r) => r.id === ev.course.id);
        if (idx === -1) return [...next, row];
        next.splice(idx, 0, row);
        return next;
      });
    } else if (ev.event === "done" && ev.session !== "ok") {
      setFinished({ ok: false, error: ev.error || "Canvas session missing" });
    }
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    setFinished(null);
    onStudySyncProgress(handle)
      .then((fn) => {
        unlisten = fn;
        if (cancelled) return;
        return syncStudySources().then((res) => {
          if (cancelled) return;
          setFinished((f) => f ?? { ok: res.ok, error: res.error ?? undefined });
        });
      })
      .catch((e) => {
        if (!cancelled) setFinished({ ok: false, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [handle, attempt]);

  const failed = rows.filter((r) => r.state === "failed");
  const loaded = rows.filter((r) => r.state === "done");
  const sessionLost = finished && !finished.ok && /session/i.test(finished.error || "");

  // Completed cleanly → save the school and go Home after the last card lands.
  useEffect(() => {
    if (!finished || !finished.ok || failed.length > 0) return;
    const t = window.setTimeout(() => {
      void saveOnboarding(school, "", {}).finally(onDone);
    }, 700);
    return () => window.clearTimeout(t);
  }, [finished, failed.length, school, onDone]);

  return (
    <section className="ob-screen ob-syncing">
      <h1 ref={heading} tabIndex={-1}>
        {finished && !finished.ok && loaded.length === 0 ? "Sync didn’t finish" : finished ? "Your courses" : "Loading your courses"}
      </h1>
      <ul className="sync-cards" aria-live="polite">
        {rows.map((r) => (
          <li key={r.id} className={`glass sync-card ${r.state}`} style={{ "--course": courseHex(r.color, theme) } as React.CSSProperties}>
            <span className="course-dot" aria-hidden="true" />
            <span className="sync-card-label">{r.label}</span>
            {r.state === "done" && r.counts && (
              <span className="sync-card-counts">
                {r.counts.assignments + r.counts.discussions + r.counts.other} · {r.counts.quizzes} · {r.counts.exams}
                <span className="visually-hidden">
                  {" "}
                  assignments, quizzes, exams
                </span>
              </span>
            )}
            {r.state === "failed" && <span className="sync-card-counts failed">didn’t load</span>}
            {r.state === "pending" && <span className="sync-card-counts pending">…</span>}
          </li>
        ))}
        {rows.length === 0 && !finished && <li className="glass sync-card pending placeholder" aria-hidden="true" />}
      </ul>
      {rows.length > 0 && <p className="sync-legend muted small">assignments · quizzes · exams</p>}
      <div className="ob-buttons">
        {sessionLost && (
          <>
            <p className="ob-error" role="alert">
              Canvas session missing.
            </p>
            <button type="button" className="primary" onClick={onSessionLost}>
              Sign in again
            </button>
          </>
        )}
        {finished && !sessionLost && (failed.length > 0 || !finished.ok) && (
          <>
            <p className="ob-error" role="alert">
              {failed.length > 0 ? `${failed.length} course${failed.length === 1 ? "" : "s"} didn’t load.` : finished.error || "Sync failed."}
            </p>
            <button type="button" onClick={() => setAttempt((a) => a + 1)}>
              Retry
            </button>
            {loaded.length > 0 && (
              <button type="button" className="primary" onClick={() => void saveOnboarding(school, "", {}).finally(onDone)}>
                Continue with {loaded.length} course{loaded.length === 1 ? "" : "s"}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function WaitlistScreen({ heading }: { heading: React.MutableRefObject<HTMLHeadingElement | null> }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const [error, setError] = useState("");
  const join = (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    saveOnboarding("waitlist", "", { waitlistEmail: email.trim() })
      .then(() => setState("done"))
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setState("failed");
      });
  };
  return (
    <section className="ob-screen ob-waitlist">
      <h1 ref={heading} tabIndex={-1}>
        {state === "done" ? "You’re on the list" : "Waitlist"}
      </h1>
      {state !== "done" && (
        <form className="ob-buttons" onSubmit={join}>
          <label htmlFor="waitlist-email" className="visually-hidden">
            Email
          </label>
          <input id="waitlist-email" type="email" required placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
          {state === "failed" && (
            <p className="ob-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="primary" disabled={state === "busy"}>
            Join waitlist
          </button>
        </form>
      )}
    </section>
  );
}
