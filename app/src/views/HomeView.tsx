import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SemesterSurface, SemesterTick, CourseMap, GradeTruth, SyncHealth } from "../ipc";
import { openExternalUrl, readCourseMap, readGradeTruth, readSemester, readSyncHealth } from "../ipc";
import { SyncHealthBanner } from "../components/SyncHealthBanner";
import { clusterTicks, kindLabel, loadRange, saveRange, tickHeightPx, type RangeId } from "../semesterTicks";

/*
 * Home is a stage (MASTER §02, §11):
 *   field   — paper (`.scene-paper`)
 *   subject — the next meaningful tick as a display statement, and the semester
 *             line at full bleed beneath it
 *   orbit   — NEXT rail: a vertical mono index of the next three ticks
 *   signal  — the today-rule in the scene accent
 * The old Start/Learn/Do/Check 4-up lives inside the tick sheet now.
 */

const RANGES: { id: RangeId; label: string }[] = [
  { id: "1m", label: "1 month" },
  { id: "2m", label: "2 months" },
  { id: "3m", label: "3 months" },
  { id: "full", label: "Full semester" },
];

const DAY_MS = 86_400_000;

function nextTicks(surface: SemesterSurface, todayMs: number, n: number): SemesterTick[] {
  return surface.courses
    .flatMap((c) => c.ticks)
    .filter((t) => t.due_at && !t.completed && Date.parse(t.due_at) >= todayMs - DAY_MS)
    .sort((a, b) => Date.parse(a.due_at as string) - Date.parse(b.due_at as string))
    .slice(0, n);
}

function relativeDue(dueAt: string, todayMs: number): string {
  const days = Math.round((Date.parse(dueAt) - todayMs) / DAY_MS);
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HomeView({
  surface: surfaceProp,
  onExamPrep,
  health: healthProp,
  map: mapProp,
  grades: gradesProp,
}: {
  surface?: SemesterSurface;
  onExamPrep: (tick: SemesterTick) => void;
  health?: SyncHealth;
  map?: CourseMap;
  grades?: GradeTruth;
}) {
  const [range, setRange] = useState<RangeId>(loadRange);
  const [loaded, setLoaded] = useState<SemesterSurface | null>(surfaceProp ?? null);
  const [hover, setHover] = useState<{ tick: SemesterTick; x: number; y: number } | null>(null);
  const [popup, setPopup] = useState<SemesterTick | null>(null);
  const [health, setHealth] = useState<SyncHealth | null>(healthProp ?? null);
  const [courseId, setCourseId] = useState<string>("");
  const [map, setMap] = useState<CourseMap | null>(mapProp ?? null);
  const [grades, setGrades] = useState<GradeTruth | null>(gradesProp ?? null);
  const axis = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    saveRange(range);
  }, [range]);

  useEffect(() => {
    if (surfaceProp) {
      setLoaded(surfaceProp);
      return;
    }
    const today = new Date().toISOString();
    void readSemester(range, today).then(setLoaded);
  }, [range, surfaceProp]);

  useEffect(() => {
    if (healthProp) {
      setHealth(healthProp);
      return;
    }
    if (surfaceProp) return;
    void readSyncHealth().then(setHealth);
  }, [healthProp, surfaceProp]);

  // The course map follows whichever tick the student opened.
  useEffect(() => {
    if (mapProp) return;
    if (!health?.surfaces_enabled) return;
    const id = courseId || loaded?.courses[0]?.id;
    if (!id) return;
    if (!courseId) setCourseId(id);
    void readCourseMap(id).then(setMap);
    void readGradeTruth(id).then(setGrades);
  }, [courseId, loaded, health, mapProp]);

  useLayoutEffect(() => {
    const el = axis.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 640));
    ro.observe(el);
    setWidth(el.clientWidth || 640);
    return () => ro.disconnect();
  }, [loaded]);

  const surface = surfaceProp ?? loaded;
  const todayMs = Date.parse(surface?.today || new Date().toISOString());
  const upcoming = surface ? nextTicks(surface, todayMs, 3) : [];
  const lead = upcoming[0];
  const hasCourses = Boolean(surface && surface.courses.length > 0);

  const openTick = (tick: SemesterTick) => {
    if (!mapProp && tick.course_id !== courseId) setCourseId(tick.course_id);
    setPopup(tick);
  };

  return (
    <section className="home scene-paper" aria-labelledby="home-heading">
      <header className="home-index">
        <h1 id="home-heading" className="index-label">
          Home
        </h1>
        <span className="mono home-date">{new Date(todayMs).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
        <fieldset className="segmented home-range" aria-label="Time range">
          {RANGES.map((r) => (
            <label key={r.id} className={range === r.id ? "on" : undefined}>
              <input type="radio" name="range" value={r.id} checked={range === r.id} onChange={() => setRange(r.id)} />
              {r.label}
            </label>
          ))}
        </fieldset>
      </header>

      <SyncHealthBanner health={health} inspectUrl={map?.course?.html_url} />

      <div className="home-stage">
        <div className="home-subject">
          {!surface && <p className="muted">Loading…</p>}
          {surface && !hasCourses && (
            <p className="home-statement display">
              No courses yet.
            </p>
          )}
          {hasCourses && lead && lead.due_at && (
            <>
              <p className="mono home-kicker">
                <span style={{ ["--course" as string]: lead.color }} className="course-dot" aria-hidden="true" />
                {lead.course_label} · {kindLabel(lead.kind)} · {relativeDue(lead.due_at, todayMs)}
              </p>
              <button type="button" className="home-statement display" onClick={() => openTick(lead)}>
                {lead.title}
              </button>
            </>
          )}
          {hasCourses && !lead && (
            <p className="home-statement display">Nothing due in this window.</p>
          )}
        </div>

        {upcoming.length > 0 && (
          <aside className="next-rail" aria-label="Next up">
            <span className="index-label">Next</span>
            <ol>
              {upcoming.map((t, i) => (
                <li key={t.id} style={{ ["--course" as string]: t.color }}>
                  <button type="button" onClick={() => openTick(t)}>
                    <span className="mono idx">{String(i + 1).padStart(2, "0")}</span>
                    <span className="rail-body">
                      <strong>{t.title}</strong>
                      <span className="mono">
                        {t.course_label} · {t.due_at ? shortDate(t.due_at) : "no date"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>

      {hasCourses && surface && (
        <div className="semester bleed" ref={axis}>
          <TodayLine start={surface.window_start} end={surface.window_end} today={surface.today} />
          {surface.courses.map((course) => (
            <CourseRow
              key={course.id}
              label={course.label}
              color={course.color}
              inferred={course.term.source === "inferred"}
              clusters={clusterTicks(course.ticks, surface.window_start, surface.window_end, width)}
              todayMs={todayMs}
              onHover={(tick, el) => {
                const r = el.getBoundingClientRect();
                setHover({ tick, x: r.left + r.width / 2, y: r.top });
              }}
              onLeave={() => setHover(null)}
              onOpen={openTick}
            />
          ))}
        </div>
      )}

      {hover && <TickBubble tick={hover.tick} x={hover.x} y={hover.y} />}
      {popup && (
        <ItemSheet
          tick={popup}
          map={map && (!map.course?.id || map.course.id === popup.course_id) ? map : null}
          grades={grades}
          onClose={() => setPopup(null)}
          onPlan={() => {
            onExamPrep(popup);
            setPopup(null);
          }}
        />
      )}
    </section>
  );
}

function CourseMapLedger({ map, grades }: { map: CourseMap; grades: GradeTruth | null }) {
  const lead = grades?.lead;
  const startHere = map.start_here || [];
  const learn = map.learn || [];
  const doRows = (map.do || []).slice(0, 12);
  if (startHere.length + learn.length + doRows.length === 0 && !lead && !map.fallback_reason) return null;
  return (
    <div className="course-map ledger">
      {map.fallback_reason && <p className="muted mono">{map.fallback_reason}</p>}
      {startHere.length > 0 && (
      <section aria-labelledby="map-start">
        <h3 id="map-start" className="index-label">
          Start here
        </h3>
        <ul>
          {startHere.map((row) => (
            <li key={row.title}>
              {row.html_url ? (
                <button type="button" className="link" onClick={() => void openExternalUrl(row.html_url as string)}>
                  {row.title}
                </button>
              ) : (
                row.title
              )}
            </li>
          ))}
        </ul>
      </section>
      )}
      {learn.length > 0 && (
      <section aria-labelledby="map-learn">
        <h3 id="map-learn" className="index-label">
          Learn
        </h3>
        <ul>
          {learn.map((row) => (
            <li key={row.id}>
              {row.title}
              {row.lti && <span className="muted"> · launch in browser</span>}
              {row.locked && <span className="muted"> · locked</span>}
            </li>
          ))}
        </ul>
      </section>
      )}
      {doRows.length > 0 && (
      <section aria-labelledby="map-do">
        <h3 id="map-do" className="index-label">
          Do
        </h3>
        <ul>
          {doRows.map((row) => (
            <li key={row.id}>
              {row.title}
              <span className="muted"> · {row.submission_state}</span>
            </li>
          ))}
        </ul>
      </section>
      )}
      {lead && (
      <section aria-labelledby="map-check">
        <h3 id="map-check" className="index-label">
          Check
        </h3>
        <p>
          Canvas says {lead.canvas_says ?? "—"}
          {lead.canvas_letter ? ` (${lead.canvas_letter})` : ""}; if the {lead.unsubmitted_due_count ?? 0} unsubmitted
          items count as zero, your estimate is {lead.risk ?? "—"}. {lead.why}
        </p>
      </section>
      )}
    </div>
  );
}

function TodayLine({ start, end, today }: { start: string; end: string; today: string }) {
  const span = Math.max(1, Date.parse(end) - Date.parse(start));
  const pct = ((Date.parse(today) - Date.parse(start)) / span) * 100;
  const left = Math.min(100, Math.max(0, pct));
  return (
    <div className="today-line" style={{ left: `${left}%` }} aria-hidden="true">
      <span className="mono">Today</span>
    </div>
  );
}

function CourseRow({
  label,
  color,
  inferred,
  clusters,
  todayMs,
  onHover,
  onLeave,
  onOpen,
}: {
  label: string;
  color: string;
  inferred: boolean;
  clusters: ReturnType<typeof clusterTicks>;
  todayMs: number;
  onHover: (tick: SemesterTick, el: HTMLElement) => void;
  onLeave: () => void;
  onOpen: (tick: SemesterTick) => void;
}) {
  return (
    <div className="course-row" style={{ ["--course" as string]: color }}>
      <div className="course-meta mono">
        <span className="course-dot" aria-hidden="true" />
        <strong>{label}</strong>
        {inferred && <span className="muted">dates inferred</span>}
      </div>
      <div className="axis" role="listbox" aria-label={label}>
        {clusters.map((c) => {
          const tick = c.ticks[0];
          const past = Date.parse(c.due_at) < todayMs;
          const grouped = c.ticks.length > 1;
          return (
            <button
              key={c.id}
              type="button"
              role="option"
              className={`tick${past ? " past" : ""}${tick.completed ? " done" : ""} tick-${tick.kind}`}
              style={{
                left: `${c.x}px`,
                height: grouped ? 18 : tickHeightPx(tick),
                minWidth: 12,
              }}
              aria-label={grouped ? `${c.ticks.length} items` : tick.title}
              onMouseEnter={(e) => onHover(tick, e.currentTarget)}
              onMouseLeave={onLeave}
              onFocus={(e) => onHover(tick, e.currentTarget)}
              onBlur={onLeave}
              onClick={() => onOpen(tick)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const buttons = Array.from(e.currentTarget.parentElement?.querySelectorAll("button") ?? []);
                  const i = buttons.indexOf(e.currentTarget);
                  const next = e.key === "ArrowRight" ? buttons[i + 1] : buttons[i - 1];
                  (next as HTMLButtonElement | undefined)?.focus();
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function TickBubble({ tick, x, y }: { tick: SemesterTick; x: number; y: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ left: x, top: y - 8 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = x - r.width / 2;
    let top = y - r.height - 10;
    left = Math.min(window.innerWidth - r.width - 8, Math.max(8, left));
    if (top < 8) top = y + 16;
    setPos({ left, top });
  }, [x, y, tick.id]);
  const weightPct = Math.round((tick.weight_share || 0) * 1000) / 10;
  return (
    <div ref={ref} className="bubble" style={{ left: pos.left, top: pos.top }} role="tooltip">
      <span className="kind-badge">{kindLabel(tick.kind)}</span>
      <strong>{tick.title}</strong>
      <span className="mono">{tick.course_label}</span>
      <span className="mono">{tick.due_at ? new Date(tick.due_at).toLocaleString() : "No due date"}</span>
      <span className="mono">
        {tick.points_possible ?? 0} pts · {weightPct}% of course
      </span>
    </div>
  );
}

function ItemSheet({
  tick,
  map,
  grades,
  onClose,
  onPlan,
}: {
  tick: SemesterTick;
  map: CourseMap | null;
  grades: GradeTruth | null;
  onClose: () => void;
  onPlan: () => void;
}) {
  const examish = tick.kind === "exam" || tick.kind === "quiz";
  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div
        className="glass item-popup sheet"
        role="dialog"
        aria-labelledby="item-pop-title"
        style={{ ["--course" as string]: tick.color }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="kind-badge">{kindLabel(tick.kind)}</span>
        <h2 id="item-pop-title" className="editorial">
          {tick.title}
        </h2>
        <p className="mono">
          {tick.course_label} · {tick.due_at ? new Date(tick.due_at).toLocaleString() : "No due date"}
        </p>
        {tick.description && <p className="cover">{tick.description.slice(0, 600)}</p>}
        <div className="sheet-actions">
          {examish && (
            <button type="button" className="primary" onClick={onPlan}>
              View plan
            </button>
          )}
          {tick.html_url && (
            <button type="button" onClick={() => void openExternalUrl(tick.html_url as string)}>
              Open in Canvas
            </button>
          )}
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {map && <CourseMapLedger map={map} grades={grades} />}
      </div>
    </div>
  );
}
