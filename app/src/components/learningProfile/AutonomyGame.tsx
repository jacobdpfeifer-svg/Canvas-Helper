export type Autonomy = "directive" | "choices";

export function AutonomyGame({
  value,
  onChange,
}: {
  value: Autonomy | null;
  onChange: (v: Autonomy) => void;
}) {
  return (
    <div className="lp-game">
      <p className="lp-game-title">
        When you're behind on something, what do you want from me?
      </p>
      <div className="lp-choices">
        <button
          type="button"
          className={value === "directive" ? "selected" : ""}
          onClick={() => onChange("directive")}
        >
          Just tell me the next step
        </button>
        <button
          type="button"
          className={value === "choices" ? "selected" : ""}
          onClick={() => onChange("choices")}
        >
          Give me the options, I'll decide
        </button>
      </div>
    </div>
  );
}
