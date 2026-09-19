import { useEffect, useRef, useState } from "react";
import type { CalendarEventKind, CourseRow, NewCalendarEvent } from "../ipc";
import { courseHex, type ThemeId } from "../theme";

const KINDS: { id: CalendarEventKind; label: string }[] = [
  { id: "study", label: "Study block" },
  { id: "class", label: "Class meeting" },
  { id: "exam", label: "Exam" },
  { id: "personal", label: "Personal" },
];

/**
 * Local-only sheet. Writes to inbox/calendar.jsonl via add_calendar_event.
 * Google Calendar is not wired here; when it is, the write must go through
 * the connector's ConfirmationGuard (preview → per-instance "yes" → execute).
 */
export function AddEventSheet({
  courses,
  theme,
  onClose,
  onAdd,
  initialDate,
}: {
  courses: CourseRow[];
  theme: ThemeId;
  onClose: () => void;
  onAdd: (event: NewCalendarEvent) => Promise<void>;
  initialDate?: string;
}) {
  const [kind, setKind] = useState<CalendarEventKind>("study");
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState(initialDate ?? todayLocal());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const course = courses.find((c) => c.id === courseId) ?? null;
  const hex = course ? courseHex(course.color, theme) : "var(--accent)";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Pick a date and a time range.");
      return;
    }
    if (end <= start) {
      setError("End must be after start.");
      return;
    }
    setBusy(true);
    onAdd({
      kind,
      title: title.trim() || (course ? `${KINDS.find((k) => k.id === kind)?.label} · ${course.code || course.label}` : KINDS.find((k) => k.id === kind)?.label || "Event"),
      course_id: course?.id ?? null,
      color_index: course?.color_index ?? null,
      start: start.toISOString(),
      end: end.toISOString(),
      note: note.trim(),
    })
      .then(onClose)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(false));
  };

  return (
    <div className="popup-scrim" role="presentation" onClick={onClose}>
      <form className="glass sheet-form add-event" role="dialog" aria-modal="true" aria-labelledby="add-event-title" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ "--course": hex } as React.CSSProperties}>
        <h2 id="add-event-title">Add to calendar</h2>
        <fieldset className="segmented kind-pick">
          <legend className="visually-hidden">Kind</legend>
          {KINDS.map((k) => (
            <label key={k.id} className={kind === k.id ? "on" : undefined}>
              <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} />
              {k.label}
            </label>
          ))}
        </fieldset>
        <label>
          <span>Title</span>
          <input ref={first} type="text" value={title} maxLength={200} placeholder="optional" onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <span>Course</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">None</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code || c.label}
              </option>
            ))}
          </select>
        </label>
        <div className="row wrap">
          <label>
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            <span>From</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label>
            <span>To</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </label>
        </div>
        <label>
          <span>Note</span>
          <input type="text" value={note} maxLength={500} placeholder="optional" onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="row">
          <button type="submit" className="primary" disabled={busy}>
            Add
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
        <p className="muted small">Saved on this computer only. Google Calendar is not written to from here.</p>
      </form>
    </div>
  );
}

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
