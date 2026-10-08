import { useEffect, useRef, useState } from "react";
import { schoolLegalText } from "../legal";
import {
  checkCanvasSession,
  chooseSchool,
  onStudySyncProgress,
  openCanvasSso,
  saveOnboarding,
  searchSchools,
  syncStudySourcesIpc,
  type SchoolMatch,
  type SchoolProfile,
  type SyncProgressCourse,
} from "../ipc";
import { ConnectCanvasMark, useReducedMotion } from "./ConnectCanvasMark";

/*
 * First run (MASTER §10, §12): one question per screen.
 *   school -> the student finds their school by name (public Instructure search)
 *             or pastes their Canvas address. Nothing is hard-coded.
 *   canvas -> SSO into that school's Canvas.
 *   sync   -> classes arrive, then Home.
 */
type Step = "school" | "canvas" | "sync";

function shortName(name: string): string {
  // Keep campus names ("University of Michigan - Ann Arbor"); drop only a trailing
  // alias that repeats the school in short form ("... - CU Boulder", "... - CarmenCanvas").
  const parts = name.split(/\s[-–]\s/);
  if (parts.length === 2 && (/canvas/i.test(parts[1]) || parts[1].split(/\s+/).some((w) => /^[A-Z]{2,4}$/.test(w)))) {
    return parts[0].trim();
  }
  return name.trim();
}

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SchoolMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<SchoolMatch | null>(null);
  const [manual, setManual] = useState(false);
  const [manualHost, setManualHost] = useState("");
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<"unknown" | "checking" | "found" | "missing">("unknown");
  const [ssoBusy, setSsoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<SyncProgressCourse[]>(progressCourses ?? []);
  const [syncing, setSyncing] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const heading = useRef<HTMLHeadingElement | null>(null);
  const reduced = useReducedMotion();
  const schoolName = profile ? shortName(profile.display_name) : picked ? shortName(picked.name) : "";
  const legal = schoolLegalText(schoolName);
  const manualOk = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(manualHost.trim().replace(/^https?:\/\//i, "").split("/")[0] || "");
  const canContinue = accepted && !saving && (manual ? manualOk : Boolean(picked));

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (progressCourses) setCourses(progressCourses);
  }, [progressCourses]);

  // Debounced school search.
  useEffect(() => {
    if (step !== "school" || manual) return;
    const q = query.trim();
    if (q.length < 2 || (picked && q === picked.name)) {
      setResults([]);
      return;
    }
    let alive = true;
    setSearching(true);
    const t = window.setTimeout(() => {
      searchSchools(q)
        .then((rows) => alive && setResults(rows))
        .catch(() => alive && setResults([]))
        .finally(() => alive && setSearching(false));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query, step, manual, picked]);

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
    syncStudySourcesIpc()
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) setError(res.error || "Some classes did not load.");
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
  }, [step]);

  const confirmSchool = async () => {
    setSaving(true);
    setError(null);
    try {
      const host = manual ? manualHost.trim().replace(/^https?:\/\//i, "").split("/")[0] : (picked as SchoolMatch).host;
      const chosen = await chooseSchool(
        manual ? { host, name: host } : { host, name: (picked as SchoolMatch).name, account_id: (picked as SchoolMatch).account_id },
        manual
      );
      setProfile(chosen);
      await saveOnboarding(chosen.slug, "", {});
      setStep("canvas");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const signIn = async () => {
    setSsoBusy(true);
    setError(null);
    try {
      await openCanvasSso();
      const ok = await checkCanvasSession();
      setSession(ok ? "found" : "missing");
      if (!ok) setError("The sign-in window closed before Canvas finished. Try again.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/network/i.test(msg) ? "Couldn't reach Canvas. Check your connection and try again." : msg || "The sign-in window closed before Canvas finished. Try again.");
      setSession("missing");
    } finally {
      setSsoBusy(false);
    }
  };

  return (
    <div className="onboarding first-run nb-onboarding">
      <p className="nb-wordmark" aria-hidden="true">
        kairos
      </p>

      {step === "school" && (
        <section className="nb-step" aria-labelledby="school-title">
          <h1 id="school-title" ref={heading} tabIndex={-1}>
            Where do you go to school?
          </h1>

          {!manual && (
            <>
              <label htmlFor="school-search">School</label>
              <input
                id="school-search"
                type="search"
                autoComplete="off"
                placeholder="Start typing your school's name"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPicked(null);
                }}
              />
              <p className="visually-hidden" role="status">
                {searching ? "Searching" : results.length ? `${results.length} schools found` : ""}
              </p>
              {results.length > 0 && !picked && (
                <ul className="nb-results" aria-label="Schools">
                  {results.map((r) => (
                    <li key={r.host}>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked(r);
                          setQuery(r.name);
                          setResults([]);
                        }}
                      >
                        <strong>{r.name}</strong>
                        <span className="muted">{r.host}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {picked && (
                <p className="nb-picked">
                  <strong>{shortName(picked.name)}</strong>
                  <span className="muted">Canvas at {picked.host}</span>
                </p>
              )}
              <button type="button" className="link nb-alt" onClick={() => setManual(true)}>
                My school isn't listed
              </button>
            </>
          )}

          {manual && (
            <>
              <label htmlFor="canvas-host">Your Canvas address</label>
              <input
                id="canvas-host"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="canvas.yourschool.edu"
                value={manualHost}
                onChange={(e) => setManualHost(e.target.value)}
              />
              <p className="nb-help">It's the address in your browser when you're on Canvas.</p>
              <button type="button" className="link nb-alt" onClick={() => setManual(false)}>
                Search by name instead
              </button>
            </>
          )}

          <div className="nb-terms">
            <label className="nb-check">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              I agree to the beta terms
            </label>
            <button type="button" className="link" onClick={() => setTermsOpen(true)}>
              Read the terms
            </button>
          </div>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="primary nb-continue" disabled={!canContinue} onClick={() => void confirmSchool()}>
            {saving ? "Saving…" : "Continue"}
          </button>
        </section>
      )}

      {step === "canvas" && (
        <section className="nb-step nb-center" aria-labelledby="canvas-title">
          <h1 id="canvas-title" ref={heading} tabIndex={-1}>
            {session === "found" ? "You're already signed in" : "Connect Canvas"}
          </h1>
          <p className="nb-lede">
            {schoolName ? `Sign in the way you always do at ${schoolName}.` : "Sign in the way you always do."} Kairos never sees your password.
          </p>
          <div className="nb-mark">
            <ConnectCanvasMark reduced={reduced || session === "found"} />
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {session !== "found" && (
            <button type="button" className="primary" disabled={ssoBusy} onClick={() => void signIn()}>
              {ssoBusy ? "Waiting for Canvas…" : error ? "Try again" : "Sign in to Canvas"}
            </button>
          )}
        </section>
      )}

      {step === "sync" && (
        <section className="nb-step" aria-labelledby="sync-title">
          <h1 id="sync-title" ref={heading} tabIndex={-1}>
            Getting your classes
          </h1>
          <ul className="nb-sync">
            {courses.map((c) => (
              <li key={c.id} style={{ ["--course" as string]: c.color || "var(--muted)" }}>
                <span className="course-dot" aria-hidden="true" />
                <strong>{c.label}</strong>
                <span className="muted">
                  {c.assignments ?? 0} assignments, {c.quizzes ?? 0} quizzes, {c.exam_count ?? 0} exams
                </span>
              </li>
            ))}
          </ul>
          {syncing && <p className="visually-hidden">Syncing classes</p>}
          <TrailDoodle />
        </section>
      )}

      {termsOpen && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setTermsOpen(false)}>
          <div
            className="legal-modal"
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

/** Line doodle while classes load: a trail over two ridges (MASTER §07). Decorative. */
function TrailDoodle() {
  return (
    <svg className="nb-doodle" viewBox="0 0 320 120" aria-hidden="true">
      <path d="M6 108 L84 34 Q92 27 100 34 L150 82 L196 40 Q204 33 212 40 L314 108" />
      <path d="M70 48 L84 34 L98 47" className="snow" />
      <path d="M30 108 C 70 96 90 104 128 92 C 160 82 186 96 222 86 C 250 78 280 92 300 88" className="trail" />
      <circle cx="256" cy="22" r="11" className="sun" />
    </svg>
  );
}
