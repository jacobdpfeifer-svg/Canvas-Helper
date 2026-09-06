import { useState } from "react";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [cloudKey, setCloudKey] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);

  return (
    <div className="onboarding">
      <h1>ProductName</h1>
      {step === 0 && (
        <>
          <p>Pick your school</p>
          <select defaultValue="cu-boulder">
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
          <p>Sign into Canvas (SSO opens in app browser)</p>
          <button type="button" onClick={() => setStep(2)}>
            I signed in
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <p>Rank career priorities · values · throwaway courses</p>
          <textarea placeholder="e.g. startup > software > ops" rows={3} />
          <button type="button" onClick={() => setStep(3)}>
            Continue
          </button>
        </>
      )}
      {step === 3 && (
        <>
          <p>Local model (Ollama) — downloads in background (~4.7GB)</p>
          <div className="progress">
            <div style={{ width: `${downloadProgress}%` }} />
          </div>
          <button
            type="button"
            onClick={() => {
              const t = setInterval(() => {
                setDownloadProgress((p) => {
                  if (p >= 100) {
                    clearInterval(t);
                    return 100;
                  }
                  return p + 10;
                });
              }, 200);
            }}
          >
            Start download
          </button>
          <hr />
          <p>Or skip with your cloud API key (meets 5-min path)</p>
          <input
            value={cloudKey}
            onChange={(e) => setCloudKey(e.target.value)}
            placeholder="sk-… or Anthropic key"
          />
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (cloudKey || downloadProgress >= 100) onDone();
              else if (!cloudKey) {
                setDownloadProgress(100);
                onDone();
              }
            }}
          >
            Use my cloud API key / Finish
          </button>
          <label className="telemetry">
            <input type="checkbox" /> Opt in to crash telemetry (Sentry) for beta
          </label>
        </>
      )}
    </div>
  );
}
