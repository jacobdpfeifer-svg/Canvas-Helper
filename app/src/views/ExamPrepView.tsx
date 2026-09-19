import { useEffect, useRef, useState } from "react";
import { readExamPrep, openExternal, type ExamPrep } from "../ipc";
import { study } from "../study/api";
import { courseHex, type ThemeId } from "../theme";
import { fmtDue, pct } from "../home/ticks";

/**
 * Exam Prep: the exam name in a circular glass bubble, then a day-by-day
 * draft plan built from synced material. "Redo this plan" reshuffles the
 * deterministic split (honestly labeled); "Let's test your knowledge" routes
 * into the existing Study session for the course, or shows an honest empty
 * state when no practice items exist. No adaptive evaluation this round.
 */
export function ExamPrepView({
  courseId,
  itemId,
  theme,
  onBack,
  onStudy,
}: {
  courseId: string;
  itemId: string;
  theme: ThemeId;
  onBack: () => void;
  onStudy: (course: string) => void;
}) {
  const [prep, setPrep] = useState<ExamPrep | null>(null);
  const [seed, setSeed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [practice, setPractice] = useState<"unknown" | "yes" | "no">("unknown");
  const heading = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    readExamPrep(courseId, itemId, seed)
      .then((p) => {
        if (!cancelled) setPrep(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, itemId, seed]);

  useEffect(() => {
    heading.current?.focus();
  }, [prep?.exam.id]);

  useEffect(() => {
    if (!prep) return;
    let cancelled = false;
    study
      .status()
      .then((s) => {
        if (cancelled) return;
        const label = prep.course.label;
        setPractice(s.courses.some((c) => c === label || c === prep.course.code) ? "yes" : "no");
      })
      .catch(() => {
        if (!cancelled) setPractice("no");
      });
    return () => {
      cancelled = true;
    };
  }, [prep]);

  if (error) {
    return (
      <section className="exam-prep">
        <button type="button" className="ghost" onClick={onBack}>
          ← Home
        </button>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    );
  }
  if (!prep) {
    return (
      <section className="exam-prep">
        <p className="muted">Loading…</p>
      </section>
    );
  }
  const hex = courseHex(prep.course.color, theme);
  const { exam, plan } = prep;

  return (
    <section className="exam-prep" aria-labelledby="exam-prep-title" style={{ "--course": hex } as React.CSSProperties}>
      <div className="exam-prep-top">
        <button type="button" className="ghost" onClick={onBack}>
          ← Home
        </button>
        <span className="muted small">{prep.course.code || prep.course.label}</span>
      </div>
      <div className="exam-bubble-wrap">
        <div className="glass exam-bubble">
          <h1 id="exam-prep-title" ref={heading} tabIndex={-1}>
            {exam.title}
          </h1>
          <p className="exam-when">{fmtDue(exam.due_at)}</p>
          <p className="muted small">
            {pct(exam.weight_share)} of grade
            {plan.days_until >= 0 ? ` · ${plan.days_until === 0 ? "today" : `${plan.days_until} day${plan.days_until === 1 ? "" : "s"}`}` : ""}
          </p>
        </div>
      </div>

      <div className="plan-meta">
        <span className="kind-badge">Draft plan</span>
        <p className="muted small">{plan.note}</p>
        <button type="button" onClick={() => setSeed((s) => s + 1)} disabled={plan.days.length === 0}>
          Redo this plan
        </button>
      </div>

      {plan.days.length > 0 && (
        <ol className="plan-days" aria-label="Day-by-day plan">
          {plan.days.map((d) => (
            <li key={d.date} className={`glass plan-day${d.is_today ? " today" : ""}${d.is_review ? " review" : ""}`} aria-current={d.is_today ? "date" : undefined}>
              <div className="plan-day-head">
                <span className="plan-day-date">
                  {d.weekday} {d.date.slice(5).replace("-", "/")}
                </span>
                <span className="plan-day-label">{d.is_today ? "Today" : d.label}</span>
              </div>
              <ul className="plan-focus">
                {d.focus.map((f) => (
                  <li key={`${d.date}-${f.source_id}`}>
                    <strong>{f.title}</strong>
                    <span>{f.how}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <div className="exam-actions">
        {exam.html_url && (
          <button type="button" className="ghost" onClick={() => void openExternal(exam.html_url as string).catch(() => undefined)}>
            Open in Canvas ↗
          </button>
        )}
        {practice === "yes" ? (
          <button type="button" className="primary big" onClick={() => onStudy(prep.course.label)}>
            Let’s test your knowledge
          </button>
        ) : (
          <div className="glass exam-empty" role="status">
            <p>No practice items for this exam yet.</p>
            <p className="muted small">{practice === "unknown" ? "Checking…" : "Practice items appear once this course’s synced material has been turned into questions in Study."}</p>
          </div>
        )}
      </div>
    </section>
  );
}
