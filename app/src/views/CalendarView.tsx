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

  return (
    <section className="calendar-tab" aria-labelledby="cal-heading">
      <h1 id="cal-heading">Calendar</h1>
      <SyncHealthBanner health={surface.sync_health} />
      {surface.suggestions.length > 0 && (
        <section className="suggest" aria-label="Suggested">
          <h2>Suggested</h2>
          <ul>
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
      <button type="button" className="primary" onClick={() => setSheet(true)}>
        Add to calendar
      </button>
      <MonthGrid
        date={cursor}
        events={[
          ...surface.events.map((e) => ({ ...e, family: "local" as const })),
          ...(surface.canvas_events || []).map((e) => ({ ...e, family: "canvas" as const })),
        ]}
        onPrev={() => setCursor(shiftMonth(cursor, -1))}
        onNext={() => setCursor(shiftMonth(cursor, 1))}
      />
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

function MonthGrid({
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
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = Array.from({ length: first + days }, (_, i) => (i < first ? null : i - first + 1));
  return (
    <div className="month-grid">
      <div className="month-nav">
        <button type="button" onClick={onPrev} aria-label="Previous month">
          ‹
        </button>
        <h2>
          {date.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <button type="button" onClick={onNext} aria-label="Next month">
          ›
        </button>
      </div>
      <ol>
        {cells.map((d, i) => (
          <li key={i} className={d ? undefined : "empty"}>
            {d ?? ""}
            {d &&
              events
                .filter((e) => {
                  const s = new Date(e.start);
                  return s.getFullYear() === y && s.getMonth() === m && s.getDate() === d;
                })
                .map((e) => (
                  <span key={e.id} className={`cal-chip${e.family === "canvas" ? " canvas" : ""}`}>
                    {e.family === "canvas" ? "Canvas · " : ""}
                    {e.title}
                  </span>
                ))}
          </li>
        ))}
      </ol>
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
