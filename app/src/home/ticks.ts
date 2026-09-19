/**
 * Pure geometry for the semester line. Weights come from the daemon
 * (computed at sync time); this file only maps them to pixels and groups
 * overlapping small ticks at the current zoom. Kept free of React so it can
 * be unit-tested directly.
 */
import type { CourseRow, Tick, TickKind } from "../ipc";

export const TICK_MIN_H = 6;
export const TICK_MAX_H = 44;
/** A share at or above this draws the tallest tick (a 30% final). */
export const TICK_CAP_SHARE = 0.3;
/** Kind floors so a low-point quiz still reads as a quiz. */
export const KIND_FLOOR: Record<TickKind, number> = { exam: 30, quiz: 16, assignment: TICK_MIN_H, discussion: TICK_MIN_H, other: TICK_MIN_H };
export const KIND_WIDTH: Record<TickKind, number> = { exam: 5, quiz: 3, assignment: 2, discussion: 2, other: 2 };
/** Minimum hit-target width regardless of the drawn tick width. */
export const HIT_W = 12;
/** Small ticks closer than this (px) at the current zoom collapse into one group (Q4). */
export const CLUSTER_PX = 7;

export function tickHeight(kind: TickKind, share: number): number {
  const s = Math.max(0, Math.min(share, TICK_CAP_SHARE)) / TICK_CAP_SHARE;
  const base = TICK_MIN_H + (TICK_MAX_H - TICK_MIN_H) * Math.sqrt(s);
  return Math.round(Math.max(base, KIND_FLOOR[kind] ?? TICK_MIN_H));
}

export function parseDay(iso: string): number {
  return Date.parse(iso);
}

/** 0..1 position of an instant inside the window (window.end is exclusive: end-of-day). */
export function xFraction(dueAt: string, windowStart: string, windowEnd: string): number {
  const start = Date.parse(`${windowStart}T00:00:00`);
  const end = Date.parse(`${windowEnd}T23:59:59`);
  const t = Date.parse(dueAt);
  if (!Number.isFinite(t) || end <= start) return 0;
  return Math.max(0, Math.min(1, (t - start) / (end - start)));
}

export type Placed = { tick: Tick; x: number; h: number; w: number };

export type Group =
  | { kind: "single"; x: number; h: number; w: number; ticks: [Tick] }
  | { kind: "cluster"; x: number; h: number; w: number; ticks: Tick[] };

export function placeTicks(row: CourseRow, windowStart: string, windowEnd: string, trackPx: number): Placed[] {
  return row.ticks.map((tick) => ({
    tick,
    x: xFraction(tick.due_at, windowStart, windowEnd) * trackPx,
    h: tickHeight(tick.kind, tick.weight_share),
    w: KIND_WIDTH[tick.kind] ?? 2,
  }));
}

/**
 * Exams and quizzes never cluster. Other ticks join the previous group when
 * their centre is within CLUSTER_PX of its anchor. Groups keep the tallest
 * height so a cluster is never harder to hover than its members.
 */
export function groupTicks(placed: Placed[]): Group[] {
  const out: Group[] = [];
  const sorted = [...placed].sort((a, b) => a.x - b.x);
  for (const p of sorted) {
    const important = p.tick.kind === "exam" || p.tick.kind === "quiz";
    const last = out[out.length - 1];
    if (!important && last && last.kind !== "single" && p.x - last.x < CLUSTER_PX) {
      last.ticks.push(p.tick);
      last.h = Math.max(last.h, p.h);
      continue;
    }
    if (!important && last && last.kind === "single" && !["exam", "quiz"].includes(last.ticks[0].kind) && p.x - last.x < CLUSTER_PX) {
      out[out.length - 1] = { kind: "cluster", x: last.x, h: Math.max(last.h, p.h), w: 4, ticks: [last.ticks[0], p.tick] };
      continue;
    }
    out.push({ kind: "single", x: p.x, h: p.h, w: p.w, ticks: [p.tick] });
  }
  return out;
}

export const KIND_LABEL: Record<TickKind, string> = { exam: "Exam", quiz: "Quiz", assignment: "Homework", discussion: "Discussion", other: "Ungraded" };

export function pct(share: number): string {
  if (share <= 0) return "0%";
  if (share < 0.01) return "<1%";
  return `${Math.round(share * 100)}%`;
}

export function fmtDue(iso: string, opts: { withTime?: boolean } = {}): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (opts.withTime === false) return date;
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

/** Month boundaries inside the window, as fractions, for the axis header. */
export function monthMarks(windowStart: string, windowEnd: string): { label: string; x: number }[] {
  const start = new Date(`${windowStart}T00:00:00`);
  const end = new Date(`${windowEnd}T23:59:59`);
  const marks: { label: string; x: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  if (cursor < start) cursor.setMonth(cursor.getMonth() + 1);
  // Always label the window start month too, at x=0, if the first boundary is far in.
  const firstLabel = start.toLocaleDateString(undefined, { month: "short" });
  marks.push({ label: firstLabel, x: 0 });
  while (cursor <= end) {
    const x = (cursor.getTime() - start.getTime()) / (end.getTime() - start.getTime());
    if (x > 0.06) marks.push({ label: cursor.toLocaleDateString(undefined, { month: "short" }), x });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return marks;
}

/** Week gridlines (Mondays) as fractions. */
export function weekMarks(windowStart: string, windowEnd: string): number[] {
  const start = new Date(`${windowStart}T00:00:00`);
  const end = new Date(`${windowEnd}T23:59:59`);
  const out: number[] = [];
  const cursor = new Date(start);
  const dow = (cursor.getDay() + 6) % 7; // Monday = 0
  cursor.setDate(cursor.getDate() + ((7 - dow) % 7 || 7));
  const span = end.getTime() - start.getTime();
  if (span <= 0) return out;
  while (cursor <= end && out.length < 60) {
    out.push((cursor.getTime() - start.getTime()) / span);
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}
