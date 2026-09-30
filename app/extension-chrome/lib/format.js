/** Small display helpers shared by the dashboard stage and the side panel. */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relTime(iso, now = Date.now()) {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "";
  const diff = t - now;
  const abs = Math.abs(diff);
  const unit = abs < HOUR ? ["minute", MINUTE] : abs < DAY ? ["hour", HOUR] : ["day", DAY];
  const n = Math.max(1, Math.round(abs / unit[1]));
  if (abs < MINUTE) return "just now";
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.sign(diff) * n, unit[0]);
}

export function formatDue(iso) {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(t));
}

function pct(v) {
  return v == null ? "—" : `${Number(v).toFixed(1)}%`;
}

/** "84.0% → 66.0%", full marks, share of the final grade — null when there is nothing honest to say. */
export function costLine(cost) {
  if (!cost || cost.status === "cannot_calculate" || cost.if_zero == null) return null;
  const skip = cost.current != null ? `${pct(cost.current)} → ${pct(cost.if_zero)}` : pct(cost.if_zero);
  return {
    skip,
    full: pct(cost.if_full),
    share: cost.share_of_final != null ? `${Number(cost.share_of_final).toFixed(1)}%` : null,
    estimate: cost.status !== "ok",
  };
}

/** A 90-minute block starting 26 hours before a due date (the student edits it in the app). */
export function blockBefore(dueIso, { minutes = 90, hoursBefore = 26 } = {}) {
  const due = Date.parse(dueIso || "");
  if (!Number.isFinite(due)) return null;
  const start = due - hoursBefore * HOUR;
  if (start < Date.now()) return null;
  return { start: new Date(start).toISOString(), end: new Date(start + minutes * MINUTE).toISOString() };
}

/** Pull course + assignment ids from a Canvas URL path. */
export function assignmentFromUrl(url) {
  try {
    const m = new URL(url).pathname.match(/^\/courses\/(\d+)\/assignments\/(\d+)(?:\/|$)/);
    return m ? { courseId: m[1], assignmentId: m[2] } : null;
  } catch {
    return null;
  }
}
