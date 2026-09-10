import { useMemo, useState } from "react";
import { MICRO_FACT } from "./microFact";

export type PracticeFormat = "worked_example" | "retrieval";
export type CheckDepth = "light" | "thorough";

export type PracticeFormatResult = {
  practiceFormat: PracticeFormat;
  checkDepth: CheckDepth;
};

type Phase = "choose" | "experience" | "confidence" | "reveal";

function mapCheckDepth(
  confidence: "low" | "high",
  correct: boolean
): CheckDepth {
  // High + wrong → overconfident → thorough checks.
  // Low + right → already cautious → light is fine.
  // Otherwise default thorough.
  if (confidence === "high" && !correct) return "thorough";
  if (confidence === "low" && correct) return "light";
  return "thorough";
}

export function PracticeFormatGame({
  onComplete,
}: {
  onComplete: (result: PracticeFormatResult) => void;
}) {
  const firstOption = useMemo(
    () => (Math.random() < 0.5 ? "worked_example" : "retrieval"),
    []
  );
  const [phase, setPhase] = useState<Phase>("choose");
  const [path, setPath] = useState<PracticeFormat | null>(null);
  const [pickedAnswer, setPickedAnswer] = useState<"right" | "wrong" | null>(
    null
  );
  const [confidence, setConfidence] = useState<"low" | "high" | null>(null);
  const [checkDepth, setCheckDepth] = useState<CheckDepth>("thorough");

  const options: PracticeFormat[] =
    firstOption === "worked_example"
      ? ["worked_example", "retrieval"]
      : ["retrieval", "worked_example"];

  const finish = () => {
    // A fluent pass, or "that felt helpful", does not set the teaching model.
    // Start bias stays example-then-retrieve. Retrieval is still required later.
    onComplete({ practiceFormat: "worked_example", checkDepth });
  };

  return (
    <div className="lp-game">
      <p className="lp-game-title">Try this on a tiny example</p>
      <div className="lp-fact">
        <strong>{MICRO_FACT.title}</strong>
        <p>{MICRO_FACT.body}</p>
      </div>

      {phase === "choose" && (
        <div className="lp-choices">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setPath(opt);
                setPhase("experience");
              }}
            >
              {opt === "worked_example"
                ? "Show me a worked example"
                : "Quiz me on it first"}
            </button>
          ))}
        </div>
      )}

      {phase === "experience" && path === "worked_example" && (
        <div className="lp-experience">
          <ol className="lp-steps">
            {MICRO_FACT.workedSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="lp-prompt">{MICRO_FACT.question}</p>
          <div className="lp-choices">
            <button
              type="button"
              onClick={() => {
                setPickedAnswer("right");
                setPhase("confidence");
              }}
            >
              {MICRO_FACT.answer}
            </button>
            <button
              type="button"
              onClick={() => {
                setPickedAnswer("wrong");
                setPhase("confidence");
              }}
            >
              11:59 PM UTC the same day
            </button>
          </div>
        </div>
      )}

      {phase === "experience" && path === "retrieval" && (
        <div className="lp-experience">
          <p className="lp-prompt">{MICRO_FACT.question}</p>
          <div className="lp-choices">
            <button
              type="button"
              onClick={() => {
                setPickedAnswer("right");
                setPhase("confidence");
              }}
            >
              {MICRO_FACT.answer}
            </button>
            <button
              type="button"
              onClick={() => {
                setPickedAnswer("wrong");
                setPhase("confidence");
              }}
            >
              11:59 PM UTC the same day
            </button>
          </div>
        </div>
      )}

      {phase === "confidence" && (
        <div className="lp-experience">
          <p className="lp-prompt">How sure are you?</p>
          <div className="lp-choices">
            <button
              type="button"
              onClick={() => {
                const conf = "low";
                setConfidence(conf);
                setCheckDepth(
                  mapCheckDepth(conf, pickedAnswer === "right")
                );
                setPhase("reveal");
              }}
            >
              Low
            </button>
            <button
              type="button"
              onClick={() => {
                const conf = "high";
                setConfidence(conf);
                setCheckDepth(
                  mapCheckDepth(conf, pickedAnswer === "right")
                );
                setPhase("reveal");
              }}
            >
              High
            </button>
          </div>
        </div>
      )}

      {phase === "reveal" && (
        <div className="lp-experience">
          <p className="lp-reveal">
            {pickedAnswer === "right" ? "Correct — " : "Not quite — "}
            {MICRO_FACT.answer}.
            {confidence === "high" && pickedAnswer === "wrong"
              ? " (Worth a double-check next time.)"
              : ""}
          </p>
          {path === "retrieval" && (
            <ol className="lp-steps">
              {MICRO_FACT.workedSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          <p className="lp-prompt">
            Feeling sure is not the same as remembering. Ease is a weak signal —
            we still check this later. Start bias stays example, then retrieve.
          </p>
          <button type="button" onClick={finish}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
