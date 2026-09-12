import { useEffect, useState } from "react";
import { GENERIC_LEGAL, LEGAL_BY_SCHOOL } from "../legal";
import {
  bootstrapCanvasSync,
  checkCanvasSession,
  openCanvasSso,
  saveLearningProfile,
  saveOnboarding,
} from "../ipc";
import type { LearningProfileAnswers } from "../ipc";
import { AutonomyGame, type Autonomy } from "./learningProfile/AutonomyGame";
import {
  ChunkSizeGame,
  type ChunkSize,
} from "./learningProfile/ChunkSizeGame";
import {
  PracticeFormatGame,
  type CheckDepth,
  type PracticeFormat,
} from "./learningProfile/PracticeFormatGame";

const STEP_COUNT = 6;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [school, setSchool] = useState("cu-boulder");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [cloudKey, setCloudKey] = useState("");
  const [priorities, setPriorities] = useState("");
  const [sentryOptIn, setSentryOptIn] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [ssoBusy, setSsoBusy] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [sessionCheck, setSessionCheck] = useState<
    "pending" | "checking" | "found" | "not-found"
  >("pending");
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // Learning profile games — functional levers, not VAK labels.
  const [practiceFormat, setPracticeFormat] = useState<PracticeFormat | null>(
    null
  );
  const [checkDepth, setCheckDepth] = useState<CheckDepth | null>(null);
  const [autonomy, setAutonomy] = useState<Autonomy | null>(null);
  const [chunkSize, setChunkSize] = useState<ChunkSize | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [checkFirst, setCheckFirst] = useState(false);

  const isWaitlist = school === "waitlist";

  // On reaching the Canvas step (CU only), silently check for an already-open
  // session (browser/.auth cookies) before asking the student to sign in.
  useEffect(() => {
    if (isWaitlist || step !== 2 || sessionCheck !== "pending") return;
    let cancelled = false;
    setSessionCheck("checking");
    checkCanvasSession()
      .then((loggedIn) => {
        if (cancelled) return;
        if (loggedIn) {
          setSessionCheck("found");
          bootstrapCanvasSync();
          setStep(3);
        } else {
          setSessionCheck("not-found");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        console.error(e);
        setSessionCheck("not-found");
      });
    return () => {
      cancelled = true;
    };
  }, [step, sessionCheck, isWaitlist]);

  const legalText = LEGAL_BY_SCHOOL[school] || GENERIC_LEGAL;
  const profileReady =
    practiceFormat !== null &&
    checkDepth !== null &&
    autonomy !== null &&
    chunkSize !== null;

  function finishWaitlist() {
    setFinishing(true);
    setFinishError(null);
    saveOnboarding("waitlist", "", {
      waitlistEmail: waitlistEmail.trim(),
      sentryOptIn,
    })
      .then(() => onDone())
      .catch((e) => {
        console.error(e);
        setFinishError(String(e));
      })
      .finally(() => setFinishing(false));
  }

  return (
    <div className="onboarding">
      <h1 className="brand-mark">ProductName</h1>
      <p className="onboarding-step-label">Private beta · codename</p>
      <div
        className="onboarding-steps"
        aria-label={`Step ${step + 1} of ${STEP_COUNT}`}
      >
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <span
            key={i}
            className={i === step ? "active" : i < step ? "done" : undefined}
          />
        ))}
      </div>

      <div className="onboarding-body">
        {step === 0 && (
          <>
            <p className="onboarding-step-label">School</p>
            <p>Pick your school so policies and sync targets match.</p>
            <select
              value={school}
              onChange={(e) => {
                setSchool(e.target.value);
                setLegalAccepted(false);
                setSessionCheck("pending");
              }}
              aria-label="School"
            >
              <option value="cu-boulder">University of Colorado Boulder</option>
              <option value="waitlist">Waitlist my school…</option>
            </select>
            <button type="button" className="primary" onClick={() => setStep(1)}>
              Continue
            </button>
          </>
        )}
        {step === 1 && isWaitlist && (
          <>
            <p className="onboarding-step-label">Waitlist</p>
            <p>
              ProductName only syncs Canvas for CU Boulder today. Leave your
              email and we will notify you when your school is supported — no
              Canvas sign-in on this path.
            </p>
            <pre className="legal-sheet">{legalText}</pre>
            <label>
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
              />{" "}
              I have read and accept these terms
            </label>
            <input
              type="email"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              placeholder="you@school.edu"
              autoComplete="email"
              aria-label="Waitlist email"
            />
            <label className="telemetry">
              <input
                type="checkbox"
                checked={sentryOptIn}
                onChange={(e) => setSentryOptIn(e.target.checked)}
              />{" "}
              Opt in to crash telemetry (Sentry) for beta
            </label>
            <button
              type="button"
              className="primary"
              disabled={
                !legalAccepted || !waitlistEmail.trim() || finishing
              }
              onClick={finishWaitlist}
            >
              {finishing ? "Saving…" : "Join waitlist"}
            </button>
            {finishError && <p className="error">{finishError}</p>}
          </>
        )}
        {step === 1 && !isWaitlist && (
          <>
            <p className="onboarding-step-label">Policy</p>
            <p>School policy &amp; local-first notice</p>
            <pre className="legal-sheet">{legalText}</pre>
            <label>
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
              />{" "}
              I have read and accept these terms
            </label>
            <button
              type="button"
              className="primary"
              disabled={!legalAccepted}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </>
        )}
        {step === 2 && !isWaitlist && (
          <>
            <p className="onboarding-step-label">Canvas</p>
            {sessionCheck === "checking" || sessionCheck === "pending" ? (
              <p>Checking for an open Canvas session…</p>
            ) : (
              <>
                <p>Sign into Canvas (SSO opens in the browser helper)</p>
                <button
                  type="button"
                  className="primary"
                  disabled={ssoBusy}
                  onClick={() => {
                    setSsoBusy(true);
                    setSsoError(null);
                    openCanvasSso()
                      .then(() => {
                        bootstrapCanvasSync();
                        setStep(3);
                      })
                      .catch((e) => {
                        console.error(e);
                        setSsoError(String(e));
                      })
                      .finally(() => setSsoBusy(false));
                  }}
                >
                  {ssoBusy ? "Opening Canvas…" : "Open Canvas & sign in"}
                </button>
                {ssoError && (
                  <p className="error">
                    {ssoError} — fix the session, then try again.
                  </p>
                )}
              </>
            )}
          </>
        )}
        {step === 3 && !isWaitlist && (
          <>
            <p className="onboarding-step-label">Priorities</p>
            <p>Rank career priorities · values · throwaway courses</p>
            <textarea
              placeholder="e.g. startup > software > ops"
              rows={3}
              value={priorities}
              onChange={(e) => setPriorities(e.target.value)}
              aria-label="Career and course priorities"
            />
            <button type="button" className="primary" onClick={() => setStep(4)}>
              Continue
            </button>
          </>
        )}
        {step === 4 && !isWaitlist && (
          <div className="learning-profile-onboarding">
            <p className="onboarding-step-label">How we work</p>
            <p>Three quick ones — how do you want me to work with you?</p>

            {practiceFormat === null || checkDepth === null ? (
              <PracticeFormatGame
                onComplete={({ practiceFormat: pf, checkDepth: cd }) => {
                  setPracticeFormat(pf);
                  setCheckDepth(cd);
                }}
              />
            ) : (
              <div className="lp-game">
                <p className="lp-game-title">Practice format</p>
                <p className="lp-done-note">
                  Saved as start with a worked example, then retrieve
                  {" · "}
                  check depth {checkDepth}. A fluent pass here does not set how
                  you learn.
                </p>
              </div>
            )}

            <AutonomyGame value={autonomy} onChange={setAutonomy} />
            <ChunkSizeGame value={chunkSize} onChange={setChunkSize} />

            <label className="check-intention-opt">
              <input
                type="checkbox"
                checked={checkFirst}
                onChange={(e) => setCheckFirst(e.target.checked)}
              />{" "}
              When I open the dock, I do the 2-minute check first.
            </label>

            <button
              type="button"
              className="primary"
              disabled={profileSaving || !profileReady}
              onClick={() => {
                if (!profileReady) return;
                const answers: LearningProfileAnswers = {
                  practiceFormat,
                  autonomy,
                  chunkSize,
                  checkDepth,
                  ifThen: checkFirst
                    ? "When I open the dock, I do the 2-minute check first."
                    : "",
                };
                setProfileSaving(true);
                setProfileError(null);
                saveLearningProfile(answers)
                  .then(() => setStep(5))
                  .catch((e) => {
                    console.error(e);
                    setProfileError(String(e));
                  })
                  .finally(() => setProfileSaving(false));
              }}
            >
              {profileSaving ? "Saving…" : "Continue"}
            </button>
            {profileError && <p className="error">{profileError}</p>}
            <button
              type="button"
              className="skip"
              onClick={() => setStep(5)}
            >
              Skip — I&apos;ll figure this out as I go
            </button>
          </div>
        )}
        {step === 5 && !isWaitlist && (
          <>
            <p className="onboarding-step-label">Finish</p>
            <p>
              Optional hosted API key for assistant calls. Skip to finish without
              a key. You can add one later.
            </p>
            <input
              value={cloudKey}
              onChange={(e) => setCloudKey(e.target.value)}
              placeholder="Cloud API key"
              autoComplete="off"
            />
            <label className="telemetry">
              <input
                type="checkbox"
                checked={sentryOptIn}
                onChange={(e) => setSentryOptIn(e.target.checked)}
              />{" "}
              Opt in to crash telemetry (Sentry) for beta
            </label>
            <button
              type="button"
              className="primary"
              disabled={finishing}
              onClick={() => {
                setFinishing(true);
                setFinishError(null);
                saveOnboarding(school, cloudKey.trim(), {
                  priorities,
                  sentryOptIn,
                })
                  .then(() => onDone())
                  .catch((e) => {
                    console.error(e);
                    setFinishError(String(e));
                  })
                  .finally(() => setFinishing(false));
              }}
            >
              {finishing
                ? "Saving…"
                : cloudKey.trim()
                  ? "Save key & finish"
                  : "Skip cloud key & finish"}
            </button>
            {finishError && <p className="error">{finishError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
