import { useState } from "react";
import { StudyRequestError, connectors } from "../study/api";

/**
 * Preview → confirm → create for a Google Calendar study block. The token
 * returned by the preview is bound to exactly this content; changing a field
 * invalidates it, and a disconnected calendar never "creates" anything.
 */
export function PlanEvent() {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [why, setWhy] = useState("study block");
  const [preview, setPreview] = useState<{ token: string; executable: boolean; note: string; fields: string } | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const fieldsKey = JSON.stringify([summary, start, end, why]);
  const stale = preview !== null && preview.fields !== fieldsKey;

  const doPreview = async () => {
    setError("");
    setResult("");
    try {
      const res = await connectors.gcalPreview(summary, toIso(start), toIso(end), why);
      setPreview({ token: res.confirmation_token, executable: res.executable, note: res.note, fields: fieldsKey });
    } catch (e) {
      setError(e instanceof StudyRequestError ? e.message : String(e));
    }
  };
  const doConfirm = async () => {
    if (!preview || stale) return;
    setError("");
    try {
      const res = await connectors.gcalConfirm(summary, toIso(start), toIso(end), why, preview.token);
      setResult(`Created “${res.created.summary}” in Google Calendar (${res.mode}).`);
      setPreview(null);
    } catch (e) {
      setError(e instanceof StudyRequestError ? e.message : String(e));
      setPreview(null);
    }
  };

  if (!open) {
    return (
      <button type="button" className="link" onClick={() => setOpen(true)}>
        Add a study block to Google Calendar
      </button>
    );
  }
  return (
    <form
      className="plan-event"
      onSubmit={(e) => {
        e.preventDefault();
        void doPreview();
      }}
    >
      <label htmlFor="pe-summary">Title</label>
      <input id="pe-summary" type="text" value={summary} onChange={(e) => setSummary(e.target.value)} required />
      <label htmlFor="pe-start">Start</label>
      <input id="pe-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
      <label htmlFor="pe-end">End</label>
      <input id="pe-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
      <label htmlFor="pe-why">Why</label>
      <input id="pe-why" type="text" value={why} onChange={(e) => setWhy(e.target.value)} />
      <div className="row">
        <button type="submit">Preview</button>
        <button type="button" className="ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      {preview && (
        <div className="notice" role="status">
          <p>
            <strong>Preview:</strong> “{summary}” {start} → {end} ({why})
          </p>
          <p className="muted">{stale ? "You changed the details — preview again before confirming." : preview.note}</p>
          <button type="button" className="primary" disabled={!preview.executable || stale} onClick={() => void doConfirm()}>
            Yes, create this event
          </button>
        </div>
      )}
      {result && <p role="status">{result}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function toIso(local: string): string {
  if (!local) return "";
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return local;
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, "0");
  return `${local.length === 16 ? `${local}:00` : local}${sign}${hh}:${mm}`;
}
