type Item = { id: string; title: string; due: string };

export function nearestCheckpoint(
  dates: Array<string | null | undefined>
): string | null {
  const dated = dates.filter((value): value is string => Boolean(value));
  if (dated.length === 0) return null;
  return [...dated].sort()[0];
}

export function Top3Sticky({
  items,
  onExpand,
  dueCount = 0,
  checkpointDue = null,
  ifThen = "",
  obstacle = "",
  practiceLine = "",
  healthLine = "",
  streakLine = "",
  budgetLine = "",
  trailLine = "",
  onStartCheck,
}: {
  items: Item[];
  onExpand: () => void;
  dueCount?: number;
  checkpointDue?: string | null;
  ifThen?: string;
  obstacle?: string;
  practiceLine?: string;
  healthLine?: string;
  streakLine?: string;
  budgetLine?: string;
  trailLine?: string;
  onStartCheck?: () => void;
}) {
  const checks =
    dueCount === 1 ? "1 check, about 2 minutes" : `${dueCount} checks, about 2 minutes`;

  return (
    <div className="today-stack">
      <section className="top3" onClick={onExpand} role="button" tabIndex={0}>
        <h1>Today</h1>
        {streakLine ? <p className="streak-line">{streakLine}</p> : null}
        {trailLine ? <p className="streak-line">{trailLine}</p> : null}
        {healthLine ? <p className="check-chip">{healthLine}</p> : null}
        {budgetLine ? <p className="check-chip">{budgetLine}</p> : null}
        <ol>
          {items.slice(0, 3).map((item, i) => (
            <li key={item.id}>
              <span className="idx">{i + 1}</span>
              <div>
                <strong>{item.title}</strong>
                <em>{item.due}</em>
              </div>
            </li>
          ))}
        </ol>
      </section>
      {dueCount > 0 && onStartCheck && (
        <div className="check-entry">
          {ifThen && <p className="check-intention">{ifThen}</p>}
          {obstacle && <p className="check-intention">{obstacle}</p>}
          {practiceLine && <p className="check-chip">{practiceLine}</p>}
          {checkpointDue && (
            <p className="check-chip">before {checkpointDue}</p>
          )}
          <button
            type="button"
            className="check-start"
            onClick={(e) => {
              e.stopPropagation();
              onStartCheck();
            }}
          >
            {checks}
          </button>
        </div>
      )}
    </div>
  );
}
