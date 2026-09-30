import { useEffect, useRef } from "react";
import { createBlot, type BlotItem, type VoiceState } from "./core";

/** True when the app setting or the OS asks for reduced motion. */
export function prefersStill(): boolean {
  if (typeof document === "undefined") return true;
  if (document.documentElement.dataset.motion === "reduced") return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function readColors(el: Element) {
  const cs = getComputedStyle(el);
  return {
    ink: cs.getPropertyValue("--accent").trim() || "#3767ff",
    shadow: cs.getPropertyValue("--divider").trim() || "rgba(128,128,128,0.15)",
  };
}

/**
 * Blot, the voice character. Decorative: the surrounding UI carries the state
 * in text (MASTER §08/§13), so the canvas is aria-hidden. Clicking pokes it.
 *
 * Motion runs only while the canvas is on screen and the window is visible.
 * Reduced motion draws one still pose per state and schedules no frames.
 */
export function Blot({
  state,
  items = [],
  getLevel = () => 0,
  size = 160,
  seed = 1,
  className,
}: {
  state: VoiceState;
  items?: BlotItem[];
  /** Read every frame; keep it cheap (e.g. () => voicePresence.level). */
  getLevel?: () => number;
  /** CSS pixels, width; height is 1.1× for the tuft and hop. */
  size?: number;
  seed?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blotRef = useRef(createBlot({ seed }));
  const repaintRef = useRef<() => void>(() => undefined);
  const inputRef = useRef({ state, items, getLevel });
  inputRef.current = { state, items, getLevel };
  const height = Math.round(size * 1.1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    if (!canvas || !ctx) return;
    const blot = blotRef.current;
    let raf = 0;
    let last = 0;
    let onScreen = true;
    let colors = readColors(canvas);
    let still = prefersStill();

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(size * dpr);
      const h = Math.round(height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (dt: number) => {
      const { state: s, items: it, getLevel: lv } = inputRef.current;
      blot.update({ state: s, items: it, level: still ? 0 : lv() }, dt, { still });
      fit();
      ctx.clearRect(0, 0, size, height);
      blot.draw(ctx, size, height, colors, { still });
    };

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      paint(dt);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      paint(0); // draw now, so Blot never shows an empty frame
      if (still) return;
      if (onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => start();
    document.addEventListener("visibilitychange", onVisibility);

    const io =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entries) => {
            onScreen = entries.some((e) => e.isIntersecting);
            start();
          })
        : null;
    io?.observe(canvas);

    // theme or motion setting changed
    const mo = new MutationObserver(() => {
      colors = readColors(canvas);
      still = prefersStill();
      start();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-motion"] });
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener?.("change", onVisibility);
    } catch {
      mq = null;
    }

    start();
    repaintRef.current = () => {
      if (still) paint(0);
    };
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
      mo.disconnect();
      mq?.removeEventListener?.("change", onVisibility);
    };
  }, [size, height]);

  // reduced motion: repaint the still pose when the state or items change
  useEffect(() => {
    repaintRef.current();
  }, [state, items]);

  return (
    <button
      type="button"
      className={["blot", className].filter(Boolean).join(" ")}
      aria-label="Poke Blot"
      style={{ width: size, height }}
      onClick={() => blotRef.current.poke()}
    >
      <canvas ref={canvasRef} aria-hidden="true" style={{ width: size, height }} data-blot-state={state} />
    </button>
  );
}
