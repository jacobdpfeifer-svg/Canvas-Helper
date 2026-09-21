import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SemesterSurface, SemesterTick, CourseMap, GradeTruth, SyncHealth } from "../ipc";
import { openExternalUrl, readCourseMap, readGradeTruth, readSemester, readSyncHealth } from "../ipc";
import { SyncHealthBanner } from "../components/SyncHealthBanner";
import { clusterTicks, kindLabel, loadRange, saveRange, tickHeightPx, type RangeId } from "../semesterTicks";

const RANGES: { id: RangeId; label: string }[] = [
  { id: "1m", label: "1 month" },
  { id: "2m", label: "2 months" },
  { id: "3m", label: "3 months" },
  { id: "full", label: "Full semester" },
];

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

  useEffect(() => {
    if (mapProp) return;
    if (!health?.surfaces_enabled) return;
    const id = courseId || loaded?.courses[0]?.id;
    if (!id) return;
    if (!courseId) setCourseId(id);
    void readCourseMap(id).then(setMap);
    void readGradeTruth(id).then(setGrades);
  }, [courseId, loaded, health]);

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

  return (
    <section className="home" aria-labelledby="home-heading">
      <header className="home-head">
        <h1 id="home-heading">Home</h1>
        <fieldset className="segmented" aria-label="Time range">
          {RANGES.map((r) => (
            <label key={r.id} className={range === r.id ? "on" : undefined}>
              <input
                type="radio"
                name="range"
                value={r.id}
                checked={range === r.id}
                onChange={() => setRange(r.id)}
              />
              {r.label}
            </label>
          ))}
        </fieldset>
      </header>
      <SyncHealthBanner health={health} inspectUrl={map?.course?.html_url} />
      {health?.surfaces_enabled && surface && surface.courses.length > 0 && (
        <fieldset className="segmented" aria-label="Course">
          {surface.courses.map((c) => (
            <label key={c.id} className={courseId === c.id ? "on" : undefined}>
              <input type="radio" name="course" value={c.id} checked={courseId === c.id} onChange={() => setCourseId(c.id)} />
              {c.code || c.label}
            </label>
          ))}
        </fieldset>
      )}
      {map && health?.surfaces_enabled && (
        <CourseMapPanel map={map} grades={grades} />
      )}
      {!surface && <p className="muted">Loading…</p>}
      {surface && surface.courses.length === 0 && <p className="muted">No courses yet.</p>}
      {surface && surface.courses.length > 0 && (
        <div className="semester" ref={axis}>
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
              onOpen={(tick) => setPopup(tick)}
            />
          ))}
        </div>
      )}
      {hover && <TickBubble tick={hover.tick} x={hover.x} y={hover.y} />}
      {popup && (
        <ItemPopup
          tick={popup}
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

function CourseMapPanel({ map, grades }: { map: CourseMap; grades: GradeTruth | null }) {
  const lead = grades?.lead;
  const sections: { id: string; title: string }[] = [
    { id: "start", title: "Start here" },
    { id: "learn", title: "Learn" },
    { id: "do", title: "Do" },
    { id: "check", title: "Check" },
  ];
  return (
    <div className="course-map">
      {map.fallback_reason && <p className="muted">{map.fallback_reason}</p>}
      {sections.map((s) => (
        <section key={s.id} className="glass course-map-sec" aria-labelledby={`map-${s.id}`}>
          <h2 id={`map-${s.id}`}>{s.title}</h2>
          {s.id === "start" && (
            <ul>
              {(map.start_here || []).map((row) => (
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
          )}
          {s.id === "learn" && (
            <ul>
              {(map.learn || []).map((row) => (
                <li key={row.id}>
                  {row.title}
                  {row.lti && <span className="muted"> · launch in browser</span>}
                  {row.locked && <span className="muted"> · locked</span>}
                </li>
              ))}
            </ul>
          )}
          {s.id === "do" && (
            <ul>
              {(map.do || []).slice(0, 12).map((row) => (
                <li key={row.id}>
                  {row.title}
                  <span className="muted"> · {row.submission_state}</span>
                </li>
              ))}
            </ul>
          )}
          {s.id === "check" && lead && (
            <p>
              Canvas says {lead.canvas_says ?? "—"}
              {lead.canvas_letter ? ` (${lead.canvas_letter})` : ""}; if the {lead.unsubmitted_due_count ?? 0} unsubmitted
              items count as zero, your estimate is {lead.risk ?? "—"}. {lead.why}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

function TodayLine({ start, end, today }: { start: string; end: string; today: string }) {
  const span = Math.max(1, Date.parse(end) - Date.parse(start));
  const pct = ((Date.parse(today) - Date.parse(start)) / span) * 100;
  const left = Math.min(100, Math.max(0, pct));
  return <div className="today-line" style={{ left: `${left}%` }} aria-hidden="true" />;
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
      <div className="course-meta">
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
              onClick={() => onOpen(grouped ? tick : tick)}
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
    <div ref={ref} className="glass bubble" style={{ left: pos.left, top: pos.top }} role="tooltip">
      <span className="kind-badge">{kindLabel(tick.kind)}</span>
      <strong>{tick.title}</strong>
      <span>{tick.course_label}</span>
      <span>{tick.due_at ? new Date(tick.due_at).toLocaleString() : "No due date"}</span>
      <span>
        {tick.points_possible ?? 0} pts · {weightPct}% of course
      </span>
      {tick.html_url && (
        <button type="button" className="link" onClick={() => void openExternalUrl(tick.html_url as string)}>
          Open in Canvas
        </button>
      )}
    </div>
  );
}

function ItemPopup({
  tick,
  onClose,
  onPlan,
}: {
  tick: SemesterTick;
  onClose: () => void;
  onPlan: () => void;
}) {
  const examish = tick.kind === "exam" || tick.kind === "quiz";
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="glass item-popup" role="dialog" aria-labelledby="item-pop-title" onClick={(e) => e.stopPropagation()}>
        <span className="kind-badge">{kindLabel(tick.kind)}</span>
        <h2 id="item-pop-title">{tick.title}</h2>
        <p>{tick.course_label}</p>
        <p>{tick.due_at ? new Date(tick.due_at).toLocaleString() : "No due date"}</p>
        {tick.description && <p className="cover">{tick.description.slice(0, 600)}</p>}
        {tick.html_url && (
          <button type="button" onClick={() => void openExternalUrl(tick.html_url as string)}>
            Open in Canvas
          </button>
        )}
        {examish && (
          <button type="button" className="primary" onClick={onPlan}>
            View plan
          </button>
        )}
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
