export type ChunkSize = "short" | "long";

const DEMO_CHIPS = [
  { id: "1", title: "BCOR: Discussion draft", due: "Tonight" },
  { id: "2", title: "CSCI: Lab write-up", due: "Tomorrow" },
  { id: "3", title: "MATH: Problem set", due: "Wed" },
] as const;

export function ChunkSizeGame({
  value,
  onChange,
}: {
  value: ChunkSize | null;
  onChange: (v: ChunkSize) => void;
}) {
  return (
    <div className="lp-game">
      <p className="lp-game-title">How do you want these Top-3?</p>
      <ul className="lp-chips">
        {DEMO_CHIPS.map((chip) => (
          <li key={chip.id}>
            <span className="lp-chip-title">{chip.title}</span>
            <span className="lp-chip-due">{chip.due}</span>
          </li>
        ))}
      </ul>
      <div className="lp-choices">
        <button
          type="button"
          className={value === "short" ? "selected" : ""}
          onClick={() => onChange("short")}
        >
          One at a time (short bursts)
        </button>
        <button
          type="button"
          className={value === "long" ? "selected" : ""}
          onClick={() => onChange("long")}
        >
          All in one sit-down
        </button>
      </div>
    </div>
  );
}
