import { useState } from "react";
import type { CalendarEvent, CourseRow, Tick } from "../ipc";
import { courseHex, type ThemeId } from "../theme";
import { KIND_LABEL } from "../home/ticks";

type DayCell = { key: string; date: Date; inMonth: boolean; isToday: boolean };

function monthCells(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday first
  const cells: DayCell[] = [];
  const today = new Date();
  const cursor = new Date(year, month, 1 - startDow);
  for (let i = 0; i < 42; i++) {
    const d = new Date(cursor);
    cells.push({
      key: d.toISOString().slice(0, 10),
      date: d,
      inMonth: d.getMonth() === month,
      isToday: d.toDateString() === today.toDateString(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

function localKey(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Month grid at the bottom of the Calendar tab: local events plus Canvas
 * due items (from the semester read), colored by course. Click a day to add.
 */
export function MonthGrid({
  events,
  courses,
  theme,
  onDelete,
  onPickDay,
}: {
  events: CalendarEvent[];
  courses: CourseRow[];
  theme: ThemeId;
  onDelete: (id: string) => void;
  onPickDay: (date: string) => void;
}) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const cells = monthCells(ym.y, ym.m);
  const byDay = new Map<string, { events: CalendarEvent[]; ticks: { tick: Tick; course: CourseRow }[] }>();
  const bucket = (k: string) => {
    let b = byDay.get(k);
    if (!b) {
      b = { events: [], ticks: [] };
      byDay.set(k, b);
    }
    return b;
  };
  for (const ev of events) bucket(localKey(ev.start)).events.push(ev);
  for (const course of courses) for (const tick of course.ticks) bucket(localKey(tick.due_at)).ticks.push({ tick, course });
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const title = new Date(ym.y, ym.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="month" aria-label={`Calendar, ${title}`}>
      <div className="month-nav">
        <button type="button" className="ghost" aria-label="Previous month" onClick={() => setYm(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}>
          ‹
        </button>
        <h3>{title}</h3>
        <button type="button" className="ghost" aria-label="Next month" onClick={() => setYm(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}>
          ›
        </button>
      </div>
      <div className="month-grid" role="grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="month-dow" role="columnheader">
            {d}
          </div>
        ))}
        {cells.map((c) => {
          const b = byDay.get(c.key);
          return (
            <div key={c.key} role="gridcell" className={`month-cell${c.inMonth ? "" : " out"}${c.isToday ? " today" : ""}`}>
              <button type="button" className="month-day" aria-label={`Add on ${c.date.toLocaleDateString()}`} onClick={() => onPickDay(c.key)}>
                {c.date.getDate()}
              </button>
              {b?.ticks.map(({ tick, course }) => (
                <span key={tick.id} className={`month-pill due kind-${tick.kind}`} style={{ "--course": courseHex(course.color, theme) } as React.CSSProperties} title={`${KIND_LABEL[tick.kind]} · ${course.code}: ${tick.title}`}>
                  {tick.title}
                </span>
              ))}
              {b?.events.map((ev) => {
                const course = ev.course_id ? courseById.get(ev.course_id) : undefined;
                return (
                  <span key={ev.id} className={`month-pill event kind-${ev.kind}`} style={{ "--course": course ? courseHex(course.color, theme) : "var(--accent)" } as React.CSSProperties} title={`${ev.title}${ev.note ? ` — ${ev.note}` : ""}`}>
                    {ev.title}
                    <button type="button" className="pill-x" aria-label={`Remove ${ev.title}`} onClick={() => onDelete(ev.id)}>
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
