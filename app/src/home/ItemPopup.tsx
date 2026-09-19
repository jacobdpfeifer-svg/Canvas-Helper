import { useEffect, useRef, useState } from "react";
import { readExamPrep, type CourseRow, type ExamPrep, type Tick } from "../ipc";
import { courseHex, type ThemeId } from "../theme";
import { TickFacts } from "./SemesterLine";

/**
 * Click popup for any tick: facts + what it covers (synced description /
 * syllabus mentions). Exams and quizzes add "View plan" → Exam Prep. Nothing
 * here is invented: with no synced description the section simply says so.
 */
export function ItemPopup({
  tick,
  course,
  theme,
  onClose,
  onViewPlan,
  onOpenCanvas,
}: {
  tick: Tick;
  course: CourseRow;
  theme: ThemeId;
  onClose: () => void;
  onViewPlan: (target: { courseId: string; itemId: string }) => void;
  onOpenCanvas: (url: string) => void;
}) {
  const [prep, setPrep] = useState<ExamPrep | null>(null);
  const [failed, setFailed] = useState(false);
  const heading = useRef<HTMLParagraphElement | null>(null);
  const isExam = tick.kind === "exam" || tick.kind === "quiz";

  useEffect(() => {
    let cancelled = false;
    readExamPrep(course.id, tick.id)
      .then((p) => {
        if (!cancelled) setPrep(p);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [course.id, tick.id]);

  useEffect(() => {
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const description = prep?.exam.description ?? null;
  const mentions = prep?.exam.syllabus_mentions ?? [];

  return (
    <div className="popup-scrim" onClick={onClose} role="presentation">
      <div
        className="glass item-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-popup-title"
        style={{ "--course": courseHex(course.color, theme) } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="ghost icon-btn popup-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <div id="item-popup-title" ref={heading} tabIndex={-1} className="popup-focus">
          <TickFacts tick={tick} course={course} onOpenCanvas={onOpenCanvas} />
        </div>
        <section className="popup-covers" aria-label="What it covers">
          <h3>{isExam ? "What it covers" : "Details"}</h3>
          {description ? (
            <p className="covers-text">{description}</p>
          ) : failed ? (
            <p className="muted">Couldn’t read the synced description.</p>
          ) : prep ? (
            <p className="muted">No description synced from Canvas for this {isExam ? "exam" : "item"}.</p>
          ) : (
            <p className="muted">Loading…</p>
          )}
          {mentions.length > 0 && (
            <ul className="covers-mentions">
              {mentions.map((m) => (
                <li key={m}>
                  <span className="muted">Syllabus:</span> {m}
                </li>
              ))}
            </ul>
          )}
          {isExam && prep && prep.covers.length > 0 && (
            <p className="muted small">
              {prep.covers.length} synced page{prep.covers.length === 1 ? "" : "s"}/assignment{prep.covers.length === 1 ? "" : "s"} before this date
            </p>
          )}
        </section>
        {isExam && (
          <div className="popup-actions">
            <button type="button" className="primary" onClick={() => onViewPlan({ courseId: course.id, itemId: tick.id })}>
              View plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
