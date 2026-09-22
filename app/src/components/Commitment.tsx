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
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = state.commitment;
  const checkIn = state.check_in;

  if (checkIn) {
    return (
      <div className="commit-line" aria-label="Commitment check-in">
        <span className="index-label">Commitment</span>
        <p className="commit-text">{state.line || checkIn.text}</p>
        <div className="commitment-actions">
          <button type="button" className="primary" onClick={() => onResolve("met").catch(() => undefined)}>
            Met
          </button>
          <button type="button" onClick={() => onResolve("not_met").catch(() => undefined)}>
            Not met
          </button>
          <button type="button" className="ghost stop" onClick={() => onResolve("dropped").catch(() => undefined)}>
            Drop
          </button>
        </div>
      </div>
    );
  }

  if (active) {
    return (
      <div className="commit-line" aria-label="Commitment">
        <span className="index-label">Commitment</span>
        <p className="commit-text">{state.line || active.text}</p>
      </div>
    );
  }

  // No commitment yet: one quiet affordance; the form lives in a sheet.
  if (!sheetOpen) {
    return (
      <div className="commit-line" aria-label="Commitment">
        <span className="index-label">Commitment</span>
        <button type="button" className="link" onClick={() => setSheetOpen(true)}>
          Set one thing you will do
        </button>
      </div>
    );
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={() => setSheetOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setSheetOpen(false);
      }}
      role="presentation"
    >
      <section
        className="glass sheet commitment-sheet"
        role="dialog"
        aria-labelledby="commit-title"
        onClick={(event) => event.stopPropagation()}
      >
      <h2 id="commit-title" className="editorial">Commitment</h2>
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
              setSheetOpen(false);
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
        <div className="sheet-actions">
          <button type="submit" className="primary">
            Save
          </button>
          <button type="button" className="ghost" onClick={() => setSheetOpen(false)}>
            Cancel
          </button>
        </div>
        {error ? <p className="check-chip">{error}</p> : null}
      </form>
      </section>
    </div>
  );
}

export type { CommitmentRecord };
