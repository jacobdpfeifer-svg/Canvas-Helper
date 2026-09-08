import { useState } from "react";
import { GENERIC_LEGAL, LEGAL_BY_SCHOOL } from "../legal";
import { openCanvasSso, saveLearningProfile, saveOnboarding } from "../ipc";
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

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [school, setSchool] = useState("cu-boulder");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [cloudKey, setCloudKey] = useState("");
  const [ssoBusy, setSsoBusy] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
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

  const legalText = LEGAL_BY_SCHOOL[school] || GENERIC_LEGAL;
  const profileReady =
    practiceFormat !== null &&
    checkDepth !== null &&
    autonomy !== null &&
    chunkSize !== null;

  return (
    <div className="onboarding">
      <h1>ProductName</h1>
      {step === 0 && (
        <>
          <p>Pick your school</p>
          <select
            value={school}
            onChange={(e) => {
              setSchool(e.target.value);
              setLegalAccepted(false);
            }}
          >
            <option value="cu-boulder">University of Colorado Boulder</option>
            <option value="waitlist">Waitlist my school…</option>
          </select>
          <button type="button" onClick={() => setStep(1)}>
            Continue
          </button>
        </>
      )}
      {step === 1 && (
        <>
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
            disabled={!legalAccepted}
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <p>Sign into Canvas (SSO opens in the browser helper)</p>
          <button
            type="button"
            disabled={ssoBusy}
            onClick={() => {
              setSsoBusy(true);
              setSsoError(null);
              openCanvasSso()
                .then(() => setStep(3))
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
      {step === 3 && (
        <>
          <p>Rank career priorities · values · throwaway courses</p>
          <textarea placeholder="e.g. startup > software > ops" rows={3} />
          <button type="button" onClick={() => setStep(4)}>
            Continue
          </button>
        </>
      )}
      {step === 4 && (
        <div className="learning-profile-onboarding">
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
                Saved as{" "}
                {practiceFormat === "retrieval"
                  ? "quiz/retrieval first"
                  : "worked example first"}
                {" · "}
                check depth {checkDepth}.
              </p>
            </div>
          )}

          <AutonomyGame value={autonomy} onChange={setAutonomy} />
          <ChunkSizeGame value={chunkSize} onChange={setChunkSize} />

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
            Skip — I'll figure this out as I go
          </button>
        </div>
      )}
      {step === 5 && (
        <>
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
          <button
            type="button"
            className="primary"
            disabled={finishing}
            onClick={() => {
              setFinishing(true);
              setFinishError(null);
              saveOnboarding(school, cloudKey.trim())
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
          <label className="telemetry">
            <input type="checkbox" /> Opt in to crash telemetry (Sentry) for beta
          </label>
        </>
      )}
    </div>
  );
}
