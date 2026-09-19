import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CourseRow, Semester, Tick } from "../ipc";
import { courseHex, type ThemeId } from "../theme";
import { HIT_W, KIND_LABEL, fmtDue, groupTicks, monthMarks, pct, placeTicks, weekMarks, xFraction, type Group } from "./ticks";

export type TickTarget = { tick: Tick; course: CourseRow };

type Bubble = { group: Group; course: CourseRow; anchor: DOMRect };

/**
 * One row per course, one shared time axis, "today" as a single vertical
 * line. Every graded item is a tick whose height is its share of the course
 * grade (computed at sync time — never here). Hover/focus pops a glass bubble
 * immediately; Enter/click opens the item popup (owner decides what it shows).
 */
export function SemesterLine({
  data,
  theme,
  onOpenItem,
  onOpenCanvas,
}: {
  data: Semester;
  theme: ThemeId;
  onOpenItem: (target: TickTarget) => void;
  onOpenCanvas: (url: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackPx, setTrackPx] = useState(720);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const hideTimer = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTrackPx(Math.max(200, el.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const todayX = xFraction(`${data.today}T12:00:00`, data.window.start, data.window.end);
  const months = useMemo(() => monthMarks(data.window.start, data.window.end), [data.window.start, data.window.end]);
  const weeks = useMemo(() => weekMarks(data.window.start, data.window.end), [data.window.start, data.window.end]);

  const cancelHide = () => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setBubble(null), 140);
  };
  const show = useCallback((group: Group, course: CourseRow, el: HTMLElement) => {
    cancelHide();
    setBubble({ group, course, anchor: el.getBoundingClientRect() });
  }, []);

  useEffect(() => () => cancelHide(), []);

  return (
    <div className="semester" data-range={data.range}>
      <div className="semester-head">
        <div className="semester-label" aria-hidden="true" />
        <div className="semester-axis" role="presentation">
          {months.map((m) => (
            <span key={`${m.label}-${m.x}`} className="axis-month" style={{ left: `${m.x * 100}%` }}>
              {m.label}
            </span>
          ))}
        </div>
      </div>
      <div className="semester-rows">
        <div className="semester-today" style={{ left: `calc(var(--label-w) + (100% - var(--label-w)) * ${todayX})` }} aria-hidden="true">
          <span>Today</span>
        </div>
        {data.courses.map((course) => (
          <CourseLine
            key={course.id}
            course={course}
            hex={courseHex(course.color, theme)}
            data={data}
            trackPx={trackPx}
            trackRef={course === data.courses[0] ? trackRef : undefined}
            weeks={weeks}
            onShow={show}
            onHide={scheduleHide}
            onOpen={(tick) => onOpenItem({ tick, course })}
          />
        ))}
      </div>
      {bubble && (
        <TickBubble
          bubble={bubble}
          hex={courseHex(bubble.course.color, theme)}
          onEnter={cancelHide}
          onLeave={scheduleHide}
          onOpenCanvas={onOpenCanvas}
          onOpenItem={(tick) => onOpenItem({ tick, course: bubble.course })}
        />
      )}
    </div>
  );
}

function CourseLine({
  course,
  hex,
  data,
  trackPx,
  trackRef,
  weeks,
  onShow,
  onHide,
  onOpen,
}: {
  course: CourseRow;
  hex: string;
  data: Semester;
  trackPx: number;
  trackRef?: React.MutableRefObject<HTMLDivElement | null>;
  weeks: number[];
  onShow: (group: Group, course: CourseRow, el: HTMLElement) => void;
  onHide: () => void;
  onOpen: (tick: Tick) => void;
}) {
  const groups = useMemo(() => groupTicks(placeTicks(course, data.window.start, data.window.end, trackPx)), [course, data.window.start, data.window.end, trackPx]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const termNote = course.term.source === "canvas" ? null : course.term.source === "none" ? "no term dates" : "term inferred from due dates";

  const onKey = (e: React.KeyboardEvent, idx: number, group: Group) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = e.key === "ArrowRight" ? idx + 1 : idx - 1;
      buttons.current[(next + groups.length) % groups.length]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(group.ticks[0]);
    } else if (e.key === "Escape") {
      (e.currentTarget as HTMLElement).blur();
      onHide();
    }
  };

  return (
    <div className="course-line" style={{ "--course": hex } as React.CSSProperties}>
      <div className="semester-label">
        <span className="course-dot" aria-hidden="true" />
        <span className="course-code">{course.code || course.label}</span>
        {course.code && <span className="course-name">{course.label.replace(`${course.code} — `, "")}</span>}
        {termNote && <span className="course-note">{termNote}</span>}
      </div>
      <div className="semester-track" ref={trackRef} role="group" aria-label={`${course.label}: ${course.ticks.length} items in view`}>
        {weeks.map((w) => (
          <span key={w} className="axis-week" style={{ left: `${w * 100}%` }} aria-hidden="true" />
        ))}
        <span className="track-base" aria-hidden="true" />
        {groups.length === 0 && (
          <span className="track-empty">
            {course.ticks.length === 0 && course.total_items > 0 ? "nothing due in this window" : course.total_items === 0 ? "no graded items synced" : ""}
            {course.undated > 0 ? ` · ${course.undated} without a due date` : ""}
          </span>
        )}
        {groups.map((g, idx) => {
          const first = g.ticks[0];
          const isCluster = g.kind === "cluster";
          const label = isCluster
            ? `${g.ticks.length} items around ${fmtDue(first.due_at, { withTime: false })}`
            : `${KIND_LABEL[first.kind]}: ${first.title}, due ${fmtDue(first.due_at)}, ${pct(first.weight_share)} of grade${first.past ? ", past" : ""}`;
          const past = g.ticks.every((t) => t.past);
          const done = !isCluster && first.submitted === true;
          return (
            <button
              key={isCluster ? `c-${first.id}` : first.id}
              ref={(el) => {
                buttons.current[idx] = el;
              }}
              type="button"
              className={`tick tick-${isCluster ? "cluster" : first.kind}${past ? " past" : ""}${done ? " done" : ""}`}
              style={{ left: `${(g.x / trackPx) * 100}%`, width: HIT_W, "--tick-h": `${g.h}px`, "--tick-w": `${g.w}px` } as React.CSSProperties}
              aria-label={label}
              data-tick-id={isCluster ? undefined : first.id}
              data-cluster-size={isCluster ? g.ticks.length : undefined}
              onMouseEnter={(e) => onShow(g, course, e.currentTarget)}
              onMouseLeave={onHide}
              onFocus={(e) => onShow(g, course, e.currentTarget)}
              onBlur={onHide}
              onKeyDown={(e) => onKey(e, idx, g)}
              onClick={() => onOpen(first)}
            >
              <span className="tick-bar" aria-hidden="true" />
              {isCluster && <span className="tick-count" aria-hidden="true">{g.ticks.length}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const BUBBLE_W = 300;

function TickBubble({
  bubble,
  hex,
  onEnter,
  onLeave,
  onOpenCanvas,
  onOpenItem,
}: {
  bubble: Bubble;
  hex: string;
  onEnter: () => void;
  onLeave: () => void;
  onOpenCanvas: (url: string) => void;
  onOpenItem: (tick: Tick) => void;
}) {
  const { group, course, anchor } = bubble;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 700;
  const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - BUBBLE_W / 2, vw - BUBBLE_W - 8));
  const below = anchor.bottom + 8;
  const estH = group.kind === "cluster" ? 60 + group.ticks.length * 26 : 150;
  const top = below + estH > vh - 8 ? Math.max(8, anchor.top - estH - 8) : below;
  return (
    <div
      className="glass tick-bubble"
      role="tooltip"
      style={{ left, top, width: BUBBLE_W, "--course": hex } as React.CSSProperties}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {group.kind === "cluster" ? (
        <>
          <p className="bubble-kicker">
            <span className="kind-badge">{group.ticks.length} items</span> <span className="bubble-course">{course.code || course.label}</span>
          </p>
          <ul className="bubble-list">
            {group.ticks.map((t) => (
              <li key={t.id}>
                <button type="button" className="link" onClick={() => onOpenItem(t)}>
                  {t.title}
                </button>
                <span className="muted">
                  {fmtDue(t.due_at, { withTime: false })} · {pct(t.weight_share)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <TickFacts tick={group.ticks[0]} course={course} onOpenCanvas={onOpenCanvas} />
      )}
    </div>
  );
}

/** Shared by the hover bubble and the click popup. */
export function TickFacts({ tick, course, onOpenCanvas }: { tick: Tick; course: CourseRow | { code: string; label: string }; onOpenCanvas: (url: string) => void }) {
  return (
    <>
      <p className="bubble-kicker">
        <span className={`kind-badge kind-${tick.kind}`}>{KIND_LABEL[tick.kind]}</span> <span className="bubble-course">{course.code || course.label}</span>
      </p>
      <p className="bubble-title">{tick.title}</p>
      <dl className="bubble-facts">
        <dt>Due</dt>
        <dd>{fmtDue(tick.due_at)}</dd>
        <dt>Points</dt>
        <dd>
          {tick.points_possible == null ? "—" : tick.points_possible}
          {tick.group_name ? ` · ${tick.group_name}` : ""}
        </dd>
        <dt>Weight</dt>
        <dd>{pct(tick.weight_share)} of grade</dd>
        {tick.submitted === true && (
          <>
            <dt>Status</dt>
            <dd>{tick.graded ? `Graded${tick.score != null ? ` · ${tick.score}${tick.points_possible != null ? `/${tick.points_possible}` : ""}` : ""}` : "Submitted"}</dd>
          </>
        )}
      </dl>
      {tick.html_url && (
        <button type="button" className="link bubble-link" onClick={() => onOpenCanvas(tick.html_url as string)}>
          Open in Canvas ↗
        </button>
      )}
    </>
  );
}
