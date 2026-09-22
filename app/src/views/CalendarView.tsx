import { useEffect, useState } from "react";
import {
  addCalendarEvent,
  dismissCalendarSuggestion,
  readCalendarSurface,
  type CalendarEvent,
  type CalendarSuggestion,
  type CalendarSurface,
} from "../ipc";
import { SyncHealthBanner } from "../components/SyncHealthBanner";

const EMPTY: CalendarSurface = {
  events: [],
  canvas_events: [],
  suggestions: [],
  commitment: { commitment: null, check_in: null, line: "" },
};

export function CalendarView({
  surface: surfaceProp,
}: {
  surface?: CalendarSurface;
}) {
  const [surface, setSurface] = useState<CalendarSurface>(surfaceProp ?? EMPTY);
  const [sheet, setSheet] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());

  useEffect(() => {
    if (surfaceProp) {
      setSurface(surfaceProp);
      return;
    }
    void readCalendarSurface().then(setSurface);
  }, [surfaceProp]);

  const refresh = () => {
    if (surfaceProp) return;
    void readCalendarSurface().then(setSurface);
  };

  const events = [
    ...surface.events.map((e) => ({ ...e, family: "local" as const })),
    ...(surface.canvas_events || []).map((e) => ({ ...e, family: "canvas" as const })),
  ];
  const next = nextEvent(events);

  return (
    <section className="calendar-stage scene-ink" aria-labelledby="cal-heading">
      <div className="calendar-subject">
        <p className="index-label">Today</p>
        <h1 id="cal-heading" className="editorial">
          {next ? next.title : "Nothing scheduled"}
        </h1>
        {next && (
          <p className="calendar-when">
            {next.family === "canvas" ? "Canvas · " : ""}
            {formatWhen(next.start)}
          </p>
        )}
        <SyncHealthBanner health={surface.sync_health} />
        <button type="button" className="primary" onClick={() => setSheet(true)}>
          Add to calendar
        </button>
      </div>
      <aside className="calendar-orbit" aria-label="Month">
        {surface.suggestions.length > 0 && (
          <section className="suggest" aria-label="Suggested">
            <h2 className="index-label">Suggested</h2>
            <ul className="month-ledger">
              {surface.suggestions.map((sg) => (
                <SuggestionRow
                  key={sg.source_message_id}
                  sg={sg}
                  onAdd={async () => {
                    await addCalendarEvent({
                      kind: "personal",
                      title: sg.title,
                      start: sg.start,
                      end: sg.end,
                      note: sg.why,
                    });
                    refresh();
                  }}
                  onDismiss={async () => {
                    await dismissCalendarSuggestion(sg.source_message_id);
                    setSurface((s) => ({
                      ...s,
                      suggestions: s.suggestions.filter((x) => x.source_message_id !== sg.source_message_id),
                    }));
                  }}
                />
              ))}
            </ul>
          </section>
        )}
        <MonthLedger
          date={cursor}
          events={events}
          onPrev={() => setCursor(shiftMonth(cursor, -1))}
          onNext={() => setCursor(shiftMonth(cursor, 1))}
        />
      </aside>
      {sheet && (
        <AddSheet
          onClose={() => setSheet(false)}
          onSave={async (ev) => {
            const row = await addCalendarEvent(ev);
            setSurface((s) => ({ ...s, events: [...s.events, row] }));
            setSheet(false);
          }}
        />
      )}
    </section>
  );
}

function SuggestionRow({
  sg,
  onAdd,
  onDismiss,
}: {
  sg: CalendarSuggestion;
  onAdd: () => Promise<void>;
  onDismiss: () => Promise<void>;
}) {
  return (
    <li>
      <strong>{sg.title}</strong>
      <span className="muted">{sg.why}</span>
      <button type="button" onClick={() => void onAdd()}>
        Add
      </button>
      <button type="button" onClick={() => void onDismiss()}>
        Dismiss
      </button>
    </li>
  );
}

function shiftMonth(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function nextEvent(events: (CalendarEvent & { family?: string })[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return [...events]
    .filter((e) => new Date(e.start).getTime() >= start.getTime())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function MonthLedger({
  date,
  events,
  onPrev,
  onNext,
}: {
  date: Date;
  events: (CalendarEvent & { family?: string })[];
  onPrev: () => void;
  onNext: () => void;
}) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const rows = events
    .filter((e) => {
      const s = new Date(e.start);
      return s.getFullYear() === y && s.getMonth() === m;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return (
    <div className="month-ledger-wrap">
      <div className="month-nav">
        <button type="button" onClick={onPrev} aria-label="Previous month">
          Prev
        </button>
        <h2 className="index-label">
          {date.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <button type="button" onClick={onNext} aria-label="Next month">
          Next
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="muted">Nothing in this month.</p>
      ) : (
        <ol className="month-ledger">
          {rows.map((e, i) => (
            <li key={e.id}>
              <span className="mono">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <strong>
                  {e.family === "canvas" ? "Canvas · " : ""}
                  {e.title}
                </strong>
                <span className="muted">{formatWhen(e.start)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AddSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (ev: { kind: string; title: string; start: string; end: string; note?: string }) => Promise<void>;
}) {
  const [kind, setKind] = useState("study");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <form
        className="glass item-popup"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void onSave({
            kind,
            title,
            start: start ? new Date(start).toISOString() : new Date().toISOString(),
            end: end ? new Date(end).toISOString() : new Date().toISOString(),
            note: note || undefined,
          });
        }}
      >
        <h2>Add to calendar</h2>
        <label>
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="study">Study block</option>
            <option value="class">Class meeting</option>
            <option value="exam">Exam</option>
            <option value="personal">Personal</option>
          </select>
        </label>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Start
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          End
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label>
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="submit" className="primary">
          Save locally
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}
