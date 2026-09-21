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

  return (
    <section className="exam-prep">
      <button type="button" className="ghost" onClick={onBack}>
        Back
      </button>
      <div className="exam-orb glass" aria-hidden="false">
        <h1>{tick.title}</h1>
      </div>
      <p className="muted">Draft plan — reshuffled locally until a model planner exists.</p>
      <ol className="prep-days">
        {plan.days.map((d) => (
          <li key={d.date} className={`prep-day glass${d.isToday ? " today" : ""}`}>
            <strong>{d.label}</strong>
            <span className="muted">{d.mode === "review" ? "Review" : "Study"}</span>
            <ul>
              {d.topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="stack-actions">
        <button type="button" onClick={() => setSeed((s) => s + 1)}>
          Redo this plan
        </button>
        <p className="muted">Reshuffles this draft. It is not an agent rewrite yet.</p>
        {hasPractice ? (
          <button type="button" className="primary" onClick={onTest}>
            Let’s test your knowledge
          </button>
        ) : (
          <p className="empty">No practice items for this exam yet</p>
        )}
      </div>
    </section>
  );
}
