import { Skeleton } from "./Skeleton";

type Item = { id: string; title: string; due: string };

export function nearestCheckpoint(
  dates: Array<string | null | undefined>
): string | null {
  const dated = dates.filter((value): value is string => Boolean(value));
  if (dated.length === 0) return null;
  return [...dated].sort()[0];
}

/** Short session estimate from the due-review cap (1→~5 min, 2→~10 min). */
export function checkSessionLabel(dueCount: number): string {
  if (dueCount <= 0) return "";
  if (dueCount === 1) return "Start 1 check · ~5 min";
  return `Start ${dueCount} checks · ~10 min`;
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
  loading = false,
  updating = false,
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
  loading?: boolean;
  updating?: boolean;
}) {
  const checks = checkSessionLabel(dueCount);
  const hasDue = dueCount > 0;
  // When checks are due, continuity/health stay secondary so the session CTA leads.
  const secondary = hasDue
    ? [budgetLine, trailLine, healthLine, streakLine].filter(Boolean)
    : [trailLine, healthLine, budgetLine].filter(Boolean);
  const visible = items.slice(0, 3);

  const checkEntry =
    !loading && hasDue && onStartCheck ? (
      <div className="check-entry check-entry-lead">
        {ifThen && <p className="check-intention">{ifThen}</p>}
        {obstacle && <p className="check-intention">{obstacle}</p>}
        {practiceLine && <p className="meta-secondary">{practiceLine}</p>}
        {checkpointDue && (
          <p className="meta-secondary">before {checkpointDue}</p>
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
    ) : null;

  return (
    <div className="today-stack">
      {checkEntry}
      <section
        className="top3"
        onClick={onExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onExpand();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Today priorities, open ledger"
        aria-busy={loading || undefined}
      >
        <h2 className="editorial today-title">Today</h2>
        {updating && !loading ? (
          <p className="updating-cue">Updating…</p>
        ) : null}
        {loading ? (
          <>
            <div className="meta-stack">
              <Skeleton className="skeleton-line-sm" />
              <Skeleton className="skeleton-line-sm" />
              <Skeleton className="skeleton-line-sm" />
            </div>
            <div aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="top3-skeleton-row">
                  <Skeleton className="top3-skeleton-idx" />
                  <div className="top3-skeleton-body">
                    <Skeleton
                      className="skeleton-line"
                      width={i === 0 ? "78%" : i === 1 ? "64%" : "70%"}
                    />
                    <Skeleton
                      className="skeleton-line-sm"
                      width={i === 0 ? "42%" : i === 1 ? "36%" : "48%"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="meta-stack">
              {!hasDue && streakLine ? (
                <p className="meta-primary">{streakLine}</p>
              ) : null}
              {hasDue && checks ? (
                <p className="meta-primary">{dueCount === 1 ? "1 check due" : `${dueCount} checks due`}</p>
              ) : null}
              {secondary.map((line) => (
                <p key={line} className="meta-secondary">
                  {line}
                </p>
              ))}
            </div>
            {visible.length === 0 ? (
              <p className="top3-empty">Nothing due in the Top 3 yet.</p>
            ) : (
              <ol>
                {visible.map((item, i) => (
                  <li key={item.id}>
                    <span className="idx">{i + 1}</span>
                    <div>
                      <strong>{item.title}</strong>
                      {item.due ? <em>{item.due}</em> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>
    </div>
  );
}
