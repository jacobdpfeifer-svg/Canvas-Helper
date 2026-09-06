/** Narrate-after surface — own component, not buried in ledger. */
type Narration = { id: string; text: string; why: string };

export function NarrateAfter({
  items,
  onUndo,
}: {
  items: Narration[];
  onUndo: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="narrate" aria-label="Recent automations">
      <h2>The agent did</h2>
      <ul>
        {items.slice(0, 3).map((item) => (
          <li key={item.id}>
            <p>
              {item.text} <span className="why">because {item.why}</span>
            </p>
            <button type="button" onClick={() => onUndo(item.id)}>
              Undo?
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
