import { useEffect, useRef, useState } from "react";
import { GENERIC_LEGAL, LEGAL_BY_SCHOOL } from "../legal";
import { checkCanvasSession, isTauri, openCanvasSso, saveOnboarding } from "../ipc";

/**
 * First run: school + policy, an optional Canvas sign-in, then straight to a
 * first study cycle. Everything else (profile, study-style games, themes) is
 * reachable later from Settings — first value before preferences.
 */
export function FirstRun({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [school, setSchool] = useState("cu-boulder");
  const [accepted, setAccepted] = useState(false);
  const [session, setSession] = useState<"unknown" | "checking" | "found" | "missing">("unknown");
  const [ssoBusy, setSsoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const legal = LEGAL_BY_SCHOOL[school] || GENERIC_LEGAL;

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== 1 || session !== "unknown" || !isTauri()) return;
    setSession("checking");
    checkCanvasSession()
      .then((ok) => setSession(ok ? "found" : "missing"))
      .catch(() => setSession("missing"));
  }, [step, session]);

  const signIn = async () => {
    setSsoBusy(true);
    setError(null);
    try {
      await openCanvasSso();
      const ok = await checkCanvasSession();
      setSession(ok ? "found" : "missing");
      if (!ok) setError("No Canvas session was found after the browser closed. You can try again or continue without Canvas.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSsoBusy(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding(school, "", {});
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding first-run">
      <p className="brand-lockup">
        <span className="brand-echo" aria-hidden="true">
          ProductName
        </span>
        <span>ProductName</span>
      </p>
      <ol className="onboarding-steps" aria-label={`Step ${step + 1} of 3`}>
        {["School & policy", "Canvas", "Start"].map((label, i) => (
          <li key={label} className={i === step ? "active" : i < step ? "done" : undefined}>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="onboarding-body">
          <h1 ref={heading} tabIndex={-1}>
            Your school and the ground rules
          </h1>
          <label htmlFor="school">School</label>
          <select id="school" value={school} onChange={(e) => setSchool(e.target.value)}>
            <option value="cu-boulder">CU Boulder</option>
            <option value="waitlist">Somewhere else (waitlist)</option>
          </select>
          <pre className="legal-sheet" tabIndex={0} aria-label="Policy">
            {legal}
          </pre>
          <label className="check">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span className="check-box" aria-hidden="true" />
            I understand and agree.
          </label>
          <div className="row">
            <button type="button" className="primary" disabled={!accepted} onClick={() => setStep(school === "waitlist" ? 2 : 1)}>
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="onboarding-body">
          <h1 ref={heading} tabIndex={-1}>
            Connect Canvas (optional)
          </h1>
          <p>
            Signing in lets the app pull your course pages, syllabus and exam dates so practice is built from your actual material. It opens your school's login in a separate browser window; no password is stored here.
          </p>
          {session === "checking" && <p className="muted">Checking for an existing Canvas session…</p>}
          {session === "found" && <p className="notice">Signed in to Canvas already.</p>}
          {!isTauri() && <p className="muted">Canvas sign-in needs the desktop app; you can still practice with bundled material.</p>}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            {session !== "found" && (
              <button type="button" className="primary" disabled={ssoBusy || !isTauri()} onClick={() => void signIn()}>
                {ssoBusy ? "Waiting for sign-in…" : "Sign in to Canvas"}
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
              {session === "found" ? "Continue" : "Skip for now"}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="onboarding-body">
          <h1 ref={heading} tabIndex={-1}>
            Ready for a first check
          </h1>
          <p>
            Study is where you practice: one question at a time, backed by material you import. You will see why each item was chosen, and your answers stay on this computer.
          </p>
          <p className="muted">Themes, study-style preferences and your profile live in Settings whenever you want them.</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            <button type="button" className="primary" disabled={saving} onClick={() => void finish()}>
              Open Study
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
