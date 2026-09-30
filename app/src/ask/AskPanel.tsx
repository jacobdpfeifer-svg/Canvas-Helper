import { useEffect, useState } from "react";
import { StudyRequestError, study } from "../study/api";
import type { AskEnvelope, AskResponse } from "../study/types";

const MODES = [
  ["answer_now", "Answer now"],
  ["walkthrough", "Walkthrough"],
  ["mastery", "Mastery"],
  ["make_handle", "Make / handle"],
] as const;

const BOUNDARIES = [
  ["open_practice", "Open practice"],
  ["open_homework", "Open homework"],
  ["live_assessment", "Live assessment"],
  ["administration", "Administration"],
  ["external_tool", "External tool"],
] as const;

export function AskPanel({
  onResult,
  onActive,
  seed,
  label = "Ask",
  initial = null,
}: {
  onResult?: (result: AskEnvelope | null) => void;
  onActive?: (active: boolean) => void;
  seed?: { content: string; courseHint?: string; assignmentHint?: string };
  label?: string;
  initial?: AskEnvelope | null;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(seed?.content ?? "");
  const [result, setResult] = useState<AskEnvelope | null>(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [course, setCourse] = useState(initial?.context?.course_label ?? "");
  const [assignment, setAssignment] = useState(initial?.context?.assignment_label ?? "");
  const [boundary, setBoundary] = useState(initial?.classification?.boundary || "open_practice");
  const [due, setDue] = useState(initial?.context?.due ?? "");

  const apply = (next: AskEnvelope | null) => {
    setResult(next);
    onResult?.(next);
  };

  const run = async (params: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      apply(await study.askCreate(params));
    } catch (err) {
      setError(err instanceof StudyRequestError ? err.message : "Ask did not save.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initial?.input_id) setResult(initial);
  }, [initial]);

  const response: AskResponse | undefined = result?.response;
  const active = open || Boolean(response);

  useEffect(() => {
    onActive?.(active);
  }, [active, onActive]);

  useEffect(() => {
    if (!result) return;
    setCourse(result.context?.course_label ?? "");
    setAssignment(result.context?.assignment_label ?? "");
    setBoundary(result.classification?.boundary || "open_practice");
    setDue(result.context?.due ?? "");
  }, [result]);

  const saveChip = () => {
    if (!result?.input_id) return;
    setBusy(true);
    setError("");
    void study
      .askCorrect(result.input_id, { course, assignment, boundary, due })
      .then((next) => apply(next))
      .catch((err: unknown) => setError(err instanceof StudyRequestError ? err.message : "Chip did not update."))
      .finally(() => setBusy(false));
  };

  return (
    <div className="ask-panel">
      {!open && !response && (
        <button type="button" onClick={() => setOpen(true)}>
          {label}
        </button>
      )}
      {open && !response && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run({
              content,
              content_kind: "text",
              session_goal: "unknown",
              course_hint: seed?.courseHint ?? "",
              assignment_hint: seed?.assignmentHint ?? "",
            });
          }}
        >
          <label>
            <span className="index-label">Question</span>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} required />
          </label>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Working" : "Get a next step"}
          </button>
        </form>
      )}
      {response && result?.input_id && (
        <article className="ask-result" aria-live="polite">
          <p className="index-label">{response.question_type}</p>
          <p className="mono ask-chip">{response.context_chip}</p>
          <div className="ask-chip-fields">
            <label>
              Course
              <input value={course} onChange={(event) => setCourse(event.target.value)} />
            </label>
            <label>
              Assignment
              <input value={assignment} onChange={(event) => setAssignment(event.target.value)} />
            </label>
            <label>
              Boundary
              <select value={boundary} onChange={(event) => setBoundary(event.target.value)}>
                {BOUNDARIES.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due
              <input value={due} onChange={(event) => setDue(event.target.value)} />
            </label>
            <button type="button" onClick={saveChip} disabled={busy}>
              Update chip
            </button>
          </div>
          {result.context?.conflicts?.length ? (
            <ul className="ask-conflicts">
              {result.context.conflicts.map((conflict) => (
                <li key={`${conflict.field}:${conflict.note ?? ""}`}>
                  {conflict.field} disagrees. Canvas {conflict.canvas || "has no date"}. Your correction {conflict.note || "is blank"}.
                </li>
              ))}
            </ul>
          ) : null}
          <h2>{response.one_sentence}</h2>
          <p>{response.explanation}</p>
          <p className="muted">
            {response.check_status === "checked" ? "Checked." : response.check_status === "blocked" ? "Blocked." : "Not independently checked."}{" "}
            {response.assumptions}
          </p>
          {response.prose === "not_generated" && <p className="muted">Prose was not generated.</p>}
          <p>
            <strong>Next:</strong> {response.next_action.title}
          </p>
          <div className="row" role="group" aria-label="Answer mode">
            {MODES.map(([id, modeLabel]) => (
              <button
                key={id}
                type="button"
                aria-pressed={response.response_mode === id}
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void study
                    .askMode(result.input_id as string, id)
                    .then((next) => apply(next))
                    .catch((err: unknown) => setError(err instanceof StudyRequestError ? err.message : "Mode did not switch."))
                    .finally(() => setBusy(false));
                }}
              >
                {modeLabel}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="link"
            onClick={() => {
              setResult(null);
              setOpen(true);
              onResult?.(null);
            }}
          >
            Ask something else
          </button>
        </article>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
