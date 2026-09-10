import { useState } from "react";
import type { CommitmentRecord, CommitmentState } from "../ipc";

export function CommitmentPanel({
  state,
  onSet,
  onResolve,
}: {
  state: CommitmentState;
  onSet: (input: {
    text: string;
    deadline: string;
    course: string;
    linkedItemId: string;
  }) => Promise<void>;
  onResolve: (status: "met" | "not_met" | "dropped") => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [course, setCourse] = useState("");
  const [deadline, setDeadline] = useState("");
  const [linkedItemId, setLinkedItemId] = useState("");
  const [error, setError] = useState("");
  const active = state.commitment;
  const checkIn = state.check_in;

  if (checkIn) {
    return (
      <section className="retention" aria-label="Commitment check-in">
        <h2>Commitment</h2>
        <p className="check-chip">{state.line || checkIn.text}</p>
        <div className="commitment-actions">
          <button type="button" onClick={() => onResolve("met").catch(() => undefined)}>
            Met
          </button>
          <button type="button" onClick={() => onResolve("not_met").catch(() => undefined)}>
            Not met
          </button>
          <button type="button" onClick={() => onResolve("dropped").catch(() => undefined)}>
            Drop
          </button>
        </div>
      </section>
    );
  }

  if (active) {
    return (
      <section className="retention" aria-label="Commitment">
        <h2>Commitment</h2>
        <p className="check-chip">{state.line || active.text}</p>
      </section>
    );
  }

  return (
    <section className="retention" aria-label="Commitment">
      <h2>Commitment</h2>
      <form
        className="commitment-form"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          const when = deadline ? new Date(deadline).toISOString() : "";
          onSet({ text, deadline: when, course, linkedItemId })
            .then(() => {
              setText("");
              setCourse("");
              setDeadline("");
              setLinkedItemId("");
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : String(err));
            });
        }}
      >
        <label>
          What will you do
          <input
            value={text}
            maxLength={180}
            onChange={(event) => setText(event.target.value)}
            required
          />
        </label>
        <label>
          Course
          <input
            value={course}
            onChange={(event) => setCourse(event.target.value)}
          />
        </label>
        <label>
          Deadline
          <input
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            required
          />
        </label>
        <label>
          Linked item
          <input
            value={linkedItemId}
            onChange={(event) => setLinkedItemId(event.target.value)}
          />
        </label>
        <button type="submit">Save</button>
        {error ? <p className="check-chip">{error}</p> : null}
      </form>
    </section>
  );
}

export type { CommitmentRecord };
