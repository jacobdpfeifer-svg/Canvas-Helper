import { useEffect, useRef, useState } from "react";
import { schoolLegalText } from "../legal";
import {
  checkCanvasSession,
  onStudySyncProgress,
  openCanvasSso,
  saveOnboarding,
  syncStudySourcesIpc,
  type SyncProgressCourse,
} from "../ipc";
import { ConnectCanvasMark, useReducedMotion } from "./ConnectCanvasMark";

type Step = "school" | "waitlist" | "canvas" | "sync";

export function FirstRun({
  onDone,
  progressCourses,
  startStep = "school",
}: {
  onDone: () => void;
  progressCourses?: SyncProgressCourse[];
  startStep?: Step;
}) {
  const [step, setStep] = useState<Step>(startStep);
  const [school, setSchool] = useState("cu-boulder");
  const [accepted, setAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [session, setSession] = useState<"unknown" | "checking" | "found" | "missing">("unknown");
  const [ssoBusy, setSsoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<SyncProgressCourse[]>(progressCourses ?? []);
  const [syncing, setSyncing] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const heading = useRef<HTMLHeadingElement | null>(null);
  const reduced = useReducedMotion();
  const legal = schoolLegalText(school);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (progressCourses) setCourses(progressCourses);
  }, [progressCourses]);

  useEffect(() => {
    if (step !== "canvas" || session !== "unknown") return;
    setSession("checking");
    checkCanvasSession()
      .then((ok) => setSession(ok ? "found" : "missing"))
      .catch(() => setSession("missing"));
  }, [step, session]);

  useEffect(() => {
    if (step !== "canvas" || session !== "found") return;
    const t = window.setTimeout(() => setStep("sync"), 700);
    return () => window.clearTimeout(t);
  }, [step, session]);

  useEffect(() => {
    if (step !== "sync") return;
    let cancelled = false;
    setSyncing(true);
    void onStudySyncProgress((p) => {
      if (!cancelled && p.courses) setCourses(p.courses);
    });
    void saveOnboarding(school, "", {});
    syncStudySourcesIpc()
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) setError(res.error || "Some courses did not load");
        doneRef.current();
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        doneRef.current();
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, school]);

  const signIn = async () => {
    setSsoBusy(true);
    setError(null);
    try {
      await openCanvasSso();
      const ok = await checkCanvasSession();
      setSession(ok ? "found" : "missing");
      if (!ok) setError("Login window closed or no session found.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/network/i.test(msg) ? "Network error." : msg || "Login window closed or no session found.");
      setSession("missing");
    } finally {
      setSsoBusy(false);
    }
  };

  return (
    <div className="onboarding first-run thirds">
      <p className="brand-lockup">
        <span className="brand-echo" aria-hidden="true">
          ProductName
        </span>
        <span>ProductName</span>
      </p>

      {step === "school" && (
        <section className="onboarding-body">
          <h1 ref={heading} tabIndex={-1}>
            Your school
          </h1>
          <label htmlFor="school">School</label>
          <select id="school" value={school} onChange={(e) => setSchool(e.target.value)}>
            <option value="cu-boulder">CU Boulder</option>
            <option value="waitlist">Somewhere else (waitlist)</option>
          </select>
          <button type="button" className="ghost" onClick={() => setTermsOpen(true)}>
            View terms
          </button>
          <div className="stack-actions">
            <button
              type="button"
              className={accepted ? "accept-toggle filled" : "accept-toggle"}
              aria-pressed={accepted}
              onClick={() => setAccepted((v) => !v)}
            >
              Accept terms
            </button>
            <button
              type="button"
              className="primary"
              disabled={!accepted}
              onClick={() => setStep(school === "waitlist" ? "waitlist" : "canvas")}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === "waitlist" && (
        <section className="onboarding-body">
          <h1 ref={heading} tabIndex={-1}>
            Waitlist
          </h1>
        </section>
      )}

      {step === "canvas" && (
        <section className="onboarding-body connect-thirds">
          <h1 ref={heading} tabIndex={-1} className="third-top">
            {session === "found" ? "Already signed in" : "Connect Canvas"}
          </h1>
          <div className="third-mid">
            <ConnectCanvasMark reduced={reduced || session === "found"} />
          </div>
          <div className="third-bot stack-actions">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {session !== "found" && (
              <button type="button" className="primary" disabled={ssoBusy} onClick={() => void signIn()}>
                {ssoBusy ? "Waiting…" : error ? "Try again" : "Sign in to Canvas"}
              </button>
            )}
          </div>
        </section>
      )}

      {step === "sync" && (
        <section className="onboarding-body">
          <h1 ref={heading} tabIndex={-1}>
            Syncing
          </h1>
          <ul className="sync-cards">
            {courses.map((c) => (
              <li key={c.id} className="sync-card glass" style={{ ["--course" as string]: c.color || "var(--accent)" }}>
                <span className="sync-swatch" aria-hidden="true" />
                <strong>{c.label}</strong>
                <span>
                  {c.assignments ?? 0} assignments · {c.quizzes ?? 0} quizzes · {c.exam_count ?? 0} exams
                </span>
              </li>
            ))}
          </ul>
          {syncing && <p className="visually-hidden">Syncing courses</p>}
        </section>
      )}

      {termsOpen && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setTermsOpen(false)}>
          <div
            className="glass legal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="terms-title">Terms</h2>
            <pre className="legal-sheet">{legal}</pre>
            <button type="button" className="primary" onClick={() => setTermsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
