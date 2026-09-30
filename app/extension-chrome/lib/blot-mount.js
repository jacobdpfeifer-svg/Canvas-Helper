/**
 * A small Blot for the side panel, driven only by the panel's real state:
 * thinking while it loads, a hop when the view is ready, then idle (and
 * dozing if left alone). Signed out of Canvas shows the error pose.
 *
 * Decorative: the panel's own text says what is happening, so the canvas is
 * aria-hidden. No frames run while the panel is hidden or with reduced motion.
 */
import { createBlot } from "../shared/blot/index.js";

const DONE_HOLD_MS = 1600;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ width?: number, height?: number }} [size] CSS pixels
 */
export function mountBlot(canvas, { width = 56, height = 62 } = {}) {
  const ctx = canvas.getContext("2d");
  const blot = createBlot({ seed: 7 });
  let state = "idle";
  let raf = 0;
  let last = 0;
  let doneTimer = 0;
  const reduced = () => {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  };
  const colors = () => {
    const cs = getComputedStyle(canvas);
    return { ink: cs.getPropertyValue("--accent").trim() || "#3767ff", shadow: cs.getPropertyValue("--hairline").trim() || "rgba(0,0,0,0.12)" };
  };

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  function paint(dt, still) {
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    blot.update({ state }, dt, { still });
    ctx.clearRect(0, 0, width, height);
    blot.draw(ctx, width, height, colors(), { still });
  }

  function frame(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    paint(dt, false);
    raf = requestAnimationFrame(frame);
  }

  function run() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (reduced()) {
      paint(0, true);
      return;
    }
    paint(0, false); // draw now, so the panel never shows an empty frame
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", run);
  canvas.addEventListener("click", () => blot.poke());
  run();

  return {
    /** "thinking" | "done" | "idle" | "error"; done settles back to idle on its own. */
    set(next) {
      clearTimeout(doneTimer);
      state = next;
      if (next === "done") doneTimer = setTimeout(() => ((state = "idle"), reduced() && paint(0, true)), DONE_HOLD_MS);
      if (reduced()) paint(0, true);
    },
  };
}
