import { useState } from "react";
import type { CommitmentState } from "../ipc";

/**
 * "Pick one thing to do today, resolve it later" — rebuilt in the glass
 * language. Same set_commitment / resolve_commitment / read_commitment IPC.
 */
export function CommitmentCard({
  state,
  courses,
  onSet,
  onResolve,
}: {
  state: CommitmentState;
  courses: string[];
  onSet: (input: { text: string; deadline: string; course: string; linkedItemId: string }) => Promise<void>;
  onResolve: (status: "met" | "not_met" | "dropped") => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [course, setCourse] = useState("");
  const [deadline, setDeadline] = useState(() => defaultDeadline());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = state.commitment;
  const checkIn = state.check_in;

  if (checkIn) {
    return (
      <section className="glass commitment" aria-label="Commitment check-in">
        <p className="bubble-kicker">
          <span className="kind-badge">Check-in</span>
        </p>
        <p className="commitment-text">{checkIn.text}</p>
        {state.line && <p className="muted small">{state.line}</p>}
        <div className="row">
          <button type="button" className="primary" onClick={() => void onResolve("met").catch(() => undefined)}>
            Met
          </button>
          <button type="button" onClick={() => void onResolve("not_met").catch(() => undefined)}>
            Not met
          </button>
          <button type="button" className="ghost" onClick={() => void onResolve("dropped").catch(() => undefined)}>
            Drop
          </button>
        </div>
      </section>
    );
  }

  if (active) {
    return (
      <section className="glass commitment" aria-label="Commitment">
        <p className="bubble-kicker">
          <span className="kind-badge">Today</span> {active.course && <span className="bubble-course">{active.course}</span>}
        </p>
        <p className="commitment-text">{active.text}</p>
        <p className="muted small">{state.line || `By ${new Date(active.deadline).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`}</p>
      </section>
    );
  }

  return (
    <section className="glass commitment" aria-label="Commitment">
      <form
        className="commitment-form"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          setBusy(true);
          const when = deadline ? new Date(deadline).toISOString() : "";
          onSet({ text, deadline: when, course, linkedItemId: "" })
            .then(() => {
              setText("");
              setCourse("");
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
            .finally(() => setBusy(false));
        }}
      >
        <label className="commitment-what">
          <span className="visually-hidden">One thing you will do today</span>
          <input value={text} maxLength={180} placeholder="One thing you’ll do today" onChange={(event) => setText(event.target.value)} required />
        </label>
        <div className="row wrap">
          <label>
            <span className="visually-hidden">Course</span>
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">Any course</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">By when</span>
            <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} required />
          </label>
          <button type="submit" className="primary" disabled={busy || !text.trim()}>
            Commit
          </button>
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function defaultDeadline(): string {
  const d = new Date();
  d.setHours(21, 0, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
