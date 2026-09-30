import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { answerTimeline, charsWritten, DROP_FLIGHT } from "./core";
import type { VoiceItem } from "../voice/presence";

const WET_FOR = 0.12; // seconds a character keeps the wet class; CSS dries it over --motion-reveal

/**
 * The spoken answer's items, handwritten by Blot. One drop leaves Blot per
 * item and lands as its bullet, then the line writes itself in fresh ink
 * that dries to the text colour. Timing comes from the same answerTimeline
 * Blot uses, so the drops leave its body exactly as the bullets land.
 *
 * Screen readers get each full line at once; the animated letters are hidden
 * from them. With startedAt = null (reduced motion, or a finished answer)
 * everything shows immediately.
 */
export function BlotAnswer({
  items,
  startedAt,
  originRef,
}: {
  items: VoiceItem[];
  /** performance.now() when speaking began, or null to show everything. */
  startedAt: number | null;
  /** Blot's element; drops fly from its top. */
  originRef?: RefObject<HTMLElement | null>;
}) {
  const timeline = useMemo(() => answerTimeline(items), [items]);
  const end = timeline.length ? timeline[timeline.length - 1].writeEnd + WET_FOR : 0;
  const [t, setT] = useState(() => (startedAt == null ? Infinity : 0));
  const bullets = useRef<(HTMLSpanElement | null)[]>([]);
  const flown = useRef(new Set<number>());

  useEffect(() => {
    flown.current = new Set();
    if (startedAt == null) {
      setT(Infinity);
      return;
    }
    let raf = 0;
    const tick = () => {
      const now = (performance.now() - startedAt) / 1000;
      setT(now);
      if (now < end) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, end]);

  // fly each drop from Blot to its bullet as it launches
  useEffect(() => {
    if (!Number.isFinite(t)) return;
    timeline.forEach((entry) => {
      if (t < entry.launchAt || flown.current.has(entry.index)) return;
      flown.current.add(entry.index);
      const bullet = bullets.current[entry.index];
      const origin = originRef?.current;
      if (!bullet || !origin || typeof bullet.animate !== "function") return;
      const o = origin.getBoundingClientRect();
      const b = bullet.getBoundingClientRect();
      const dx = o.left + o.width / 2 - (b.left + b.width / 2);
      const dy = o.top + o.height * 0.2 - (b.top + b.height / 2);
      const arc = Math.min(80, Math.abs(dx) * 0.35 + 24);
      bullet.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.7)`, offset: 0 },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - arc}px) scale(0.95, 1.35)`, offset: 0.5 },
          { transform: "translate(0, 0) scale(1.1, 1.2)", offset: 0.78 },
          { transform: "translate(0, 0) scale(1.7, 0.55)", offset: 0.86 },
          { transform: "translate(0, 0) scale(1)", offset: 1 },
        ],
        { duration: DROP_FLIGHT * 1000 + 140, easing: "cubic-bezier(0.3, 0.6, 0.4, 1)" },
      );
    });
  }, [t, timeline, originRef]);

  if (!items.length) return null;

  return (
    <ol className="blot-answer" aria-label="Answer">
      {items.map((item, k) => {
        const entry = timeline[k];
        const n = charsWritten(entry, t);
        const launched = t >= (entry?.launchAt ?? 0);
        const written = n >= (entry?.chars ?? 0);
        const span = entry ? entry.writeEnd - entry.writeStart : 1;
        const style = item.color ? ({ "--ink": item.color } as CSSProperties) : undefined;
        return (
          <li key={`${k}-${item.title}`} style={style}>
            <span
              className="blot-bullet"
              aria-hidden="true"
              ref={(el) => {
                bullets.current[k] = el;
              }}
              style={{ visibility: launched ? "visible" : "hidden" }}
            />
            <span className="visually-hidden">
              {item.title}
              {item.due ? `, ${item.due}` : ""}
            </span>
            <span className="blot-line" aria-hidden="true">
              {Array.from(item.title.slice(0, n)).map((ch, c) => {
                const writtenAt = (entry?.writeStart ?? 0) + ((c + 1) / Math.max(1, entry?.chars ?? 1)) * span;
                return (
                  <span key={c} className={t - writtenAt < WET_FOR ? "wet" : undefined}>
                    {ch}
                  </span>
                );
              })}
            </span>
            {item.due ? (
              <span className="blot-due" aria-hidden="true" data-shown={written || undefined}>
                {item.due}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
