/**
 * The shared clock for a spoken answer that lists items. Blot (drops, shrink,
 * course colours draining) and the handwritten answer (flight, reveal) both
 * read it with the same start time, so they stay in step without talking to
 * each other.
 */

export const DROP_FLIGHT = 0.45; // seconds from leaving Blot to landing as a bullet
export const PINCH = 0.2; // tuft pulls up this long before a drop leaves
const FIRST = 0.7;
const GAP_AFTER_LINE = 0.35;
const CHARS_PER_SECOND = 18;

/**
 * @param {{ title: string }[]} items
 * @returns {{ index: number, launchAt: number, landAt: number, writeStart: number, writeEnd: number, chars: number }[]}
 */
export function answerTimeline(items) {
  const out = [];
  let t = FIRST;
  (items || []).forEach((item, index) => {
    const chars = String(item?.title ?? "").length;
    const launchAt = t;
    const landAt = launchAt + DROP_FLIGHT;
    const writeEnd = landAt + chars / CHARS_PER_SECOND;
    out.push({ index, launchAt, landAt, writeStart: landAt, writeEnd, chars });
    t = writeEnd + GAP_AFTER_LINE;
  });
  return out;
}

/** How many characters of a line are written at time t (seconds since speaking began). */
export function charsWritten(entry, t) {
  if (!entry || t <= entry.writeStart) return 0;
  if (t >= entry.writeEnd) return entry.chars;
  return Math.floor(((t - entry.writeStart) / (entry.writeEnd - entry.writeStart)) * entry.chars);
}
