import { useMemo, useState } from "react";
import type { SemesterTick } from "../ipc";
import { buildExamPlan } from "../examPlan";

export function ExamPrepView({
  tick,
  sources,
  hasPractice,
  onBack,
  onTest,
}: {
  tick: SemesterTick;
  sources: { title: string; text?: string; kind?: string }[];
  hasPractice: boolean;
  onBack: () => void;
  onTest: () => void;
}) {
  const [seed, setSeed] = useState(1);
  const today = useMemo(() => new Date(), []);
  const plan = useMemo(
    () =>
      buildExamPlan(
        {
          id: tick.id,
          title: tick.title,
          due_at: tick.due_at,
          course_label: tick.course_label,
          description: tick.description,
        },
        sources,
        today,
        seed
      ),
    [tick, sources, today, seed]
  );

  const dueLabel = tick.due_at
    ? new Date(tick.due_at).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : "No date";
  const daysLeft = tick.due_at ? Math.max(0, Math.round((Date.parse(tick.due_at) - today.getTime()) / 86_400_000)) : null;

  return (
    <section className="exam-prep scene-paper" style={{ ["--course" as string]: tick.color }}>
      <header className="exam-index">
        <button type="button" className="ghost" onClick={onBack}>
          Return
        </button>
        <span className="mono">
          {tick.course_label} · {dueLabel}
          {daysLeft !== null ? ` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"}` : ""}
        </span>
      </header>
      <h1 className="display exam-title">{tick.title}</h1>
      <p className="muted mono">Draft plan — reshuffled locally until a model planner exists.</p>
      <ol className="ledger prep-days">
        {plan.days.map((d, i) => (
          <li key={d.date} className={`prep-day${d.isToday ? " today" : ""}`} aria-current={d.isToday ? "date" : undefined}>
            <span className="mono idx">{String(i + 1).padStart(2, "0")}</span>
            <span className="rail-body">
              <strong>{d.label}</strong>
              <span className="mono muted">{d.mode === "review" ? "Review" : "Study"}</span>
              <ul>
                {d.topics.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </span>
          </li>
        ))}
      </ol>
      <div className="stack-actions">
        {hasPractice ? (
          <button type="button" className="primary" onClick={onTest}>
            Let’s test your knowledge
          </button>
        ) : (
          <p className="empty">No practice items for this exam yet</p>
        )}
        <button type="button" className="ghost" onClick={() => setSeed((s) => s + 1)}>
          Redo this plan
        </button>
        <p className="muted">Reshuffles this draft. It is not an agent rewrite yet.</p>
      </div>
    </section>
  );
}
