import { useRef, useState } from "react";
import {
  recordReviewOutcome,
  type DueReview,
  type ReviewOutcome,
  type ScoredReview,
} from "../ipc";

function rungLabel(rung: string | undefined): string | null {
  if (rung === "durable_near_checkpoint") return "durable retrieval signal";
  if (rung === "delayed_hit") return "delayed hit";
  if (rung === "attempted") return "attempted";
  if (rung === "encountered") return "encountered";
  return null;
}

function attemptHint(item: DueReview): string | null {
  if (item.start_with_example) {
    return "This does not show the answer.";
  }
  if (item.kind === "procedural") {
    return "One varied attempt, then score — not a definition recall.";
  }
  return null;
}

function resultLine(scored: ScoredReview): string {
  const when = scored.next_review_at
    ? `next ${scored.next_review_at.slice(0, 10)}`
    : scored.checkpoint_due
      ? `before ${scored.checkpoint_due}`
      : "scheduled";
  if (scored.stability_delta) {
    return `${scored.stability_delta} · ${when}`;
  }
  return `${scored.stability} · ${when}`;
}

export function ReviewSession({
  items,
  onClose,
  onFinished,
}: {
  items: DueReview[];
  onClose: () => void;
  onFinished: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [scored, setScored] = useState<ScoredReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scoring = useRef(false);

  const item = items[index];
  if (!item) {
    return null;
  }

  const hint = attemptHint(item);
  const rung = rungLabel(scored?.rung ?? item.rung);
  const last = index >= items.length - 1;

  const score = (outcome: ReviewOutcome) => {
    if (scoring.current) return;
    scoring.current = true;
    setBusy(true);
    setError(null);
    // A dock check of a previously scheduled item is a delayed attempt.
    recordReviewOutcome(item.id, outcome, false)
      .then((updated) => setScored(updated))
      .catch((e) => {
        console.error(e);
        scoring.current = false;
        setError(String(e));
      })
      .finally(() => setBusy(false));
  };

  const advance = () => {
    scoring.current = false;
    if (last) {
      onFinished();
      return;
    }
    setScored(null);
    setIndex((i) => i + 1);
  };

  return (
    <section className="review-session">
      <p className="review-progress">
        {index + 1} of {items.length}
      </p>
      <p className="review-course">{item.course}</p>
      <p className="review-claim">{item.claim}</p>
      {hint && <p className="review-hint">{hint}</p>}
      {!scored && item.why && <p className="review-why">{item.why}</p>}
      {!scored && item.counterfactual && (
        <p className="review-hint">{item.counterfactual}</p>
      )}
      {!scored && item.missing && <p className="review-hint">{item.missing}</p>}

      {scored ? (
        <>
          <p className="review-result">{resultLine(scored)}</p>
          {rung && <p className="review-hint">{rung}</p>}
          <button type="button" className="primary" onClick={advance}>
            {last ? "Done" : "Next"}
          </button>
        </>
      ) : (
        <div className="review-scores">
          <button type="button" disabled={busy} onClick={() => score("miss")}>
            Miss
          </button>
          <button type="button" disabled={busy} onClick={() => score("partial")}>
            Partial
          </button>
          <button type="button" disabled={busy} onClick={() => score("hit")}>
            Hit
          </button>
          <button type="button" disabled={busy} onClick={() => score("skipped")}>
            Skip
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      <button type="button" className="skip" onClick={onClose}>
        Close
      </button>
    </section>
  );
}
