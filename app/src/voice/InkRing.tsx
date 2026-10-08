import { useEffect, useRef } from "react";
import type { VoiceState } from "./presence";

/*
 * The voice presence (MASTER §08): an abstract "ink ring", never a character.
 * A hand-drawn ink outline around three soft color loops (pen, highlighter, and the
 * course being discussed) that overlap like ink diffusing in water. Motion is driven only by real voice state:
 *   listening  loops open and breathe with the microphone level
 *   thinking   loops orbit slowly, low amplitude
 *   speaking   loops ripple outward with the playback level
 *   done/idle  settle to a still ring
 * Reduced motion renders one still pose per state. Dependency-free Canvas 2D.
 */

type Loop = { color: string; radius: number; lobes: number; phase: number; speed: number; drift: number };

export function prefersStill(): boolean {
  if (typeof document === "undefined") return true;
  if (document.documentElement.dataset.motion === "reduced") return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function readPalette(el: Element, accent?: string): { colors: string[]; dark: boolean } {
  const cs = getComputedStyle(el);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const theme = document.documentElement.dataset.theme;
  const dark = theme === "night" || theme === "contrast";
  return {
    colors: [v("--fg", "#1d1d1f"), v("--pen", "#2f5bea"), v("--hl", "#ffe14d"), accent || v("--pen", "#2f5bea")],
    dark,
  };
}

/** Pure frame math, exported for tests: per-state amplitude, spread, and orbit. */
export function ringMotion(state: VoiceState, level: number): { amp: number; spread: number; orbit: number; ripple: number } {
  const l = Math.max(0, Math.min(1, level));
  switch (state) {
    case "listening":
      return { amp: 0.05 + 0.16 * l, spread: 0.1 + 0.12 * l, orbit: 0.2, ripple: 0 };
    case "thinking":
      return { amp: 0.04, spread: 0.16, orbit: 1, ripple: 0 };
    case "speaking":
      return { amp: 0.06 + 0.1 * l, spread: 0.08, orbit: 0.3, ripple: 0.12 + 0.3 * l };
    case "error":
      return { amp: 0.02, spread: 0.04, orbit: 0, ripple: 0 };
    default:
      return { amp: 0.03, spread: 0.05, orbit: 0, ripple: 0 };
  }
}

export function InkRing({
  state,
  getLevel,
  size = 112,
  accent,
}: {
  state: VoiceState;
  getLevel: () => number;
  size?: number;
  /** Course color of what the agent is talking about, if any. */
  accent?: string;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const levelRef = useRef(getLevel);
  levelRef.current = getLevel;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return; // jsdom / no canvas: the sheet's text carries the state
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = size * dpr;
    el.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let palette = readPalette(el, accent);
    const loops: Loop[] = palette.colors.map((color, i) => ({
      color,
      // the ink loop is a drawn outline around the color; the color loops sit inside it
      radius: i === 0 ? size * 0.33 : size * (0.25 - i * 0.012),
      lobes: 3 + (i % 3),
      phase: i * 1.7,
      speed: 0.6 + i * 0.23,
      drift: i * (Math.PI / 2),
    }));
    const themeObserver = new MutationObserver(() => {
      palette = readPalette(el, accent);
      loops.forEach((l, i) => (l.color = palette.colors[i]));
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let smooth = 0;
    let raf = 0;
    const start = performance.now();
    const c = size / 2;

    const draw = (now: number, still: boolean) => {
      const t = still ? 0 : (now - start) / 1000;
      const target = still ? 0 : levelRef.current();
      smooth += (target - smooth) * 0.18;
      const m = ringMotion(stateRef.current, smooth);
      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = palette.dark ? "screen" : "source-over";
      // color loops first, then the ink outline on top
      [1, 2, 3, 0].forEach((i) => {
        const loop = loops[i];
        const angle = loop.drift + t * 0.5 * m.orbit;
        const off = size * m.spread * 0.5;
        const cx = c + Math.cos(angle) * off;
        const cy = c + Math.sin(angle) * off;
        const ripple = m.ripple ? 1 + m.ripple * (0.5 + 0.5 * Math.sin(t * 3.2 - i * 0.9)) : 1;
        ctx.beginPath();
        for (let k = 0; k <= 72; k++) {
          const th = (k / 72) * Math.PI * 2;
          const wobble = 1 + m.amp * Math.sin(loop.lobes * th + loop.phase + t * loop.speed * 2);
          const r = loop.radius * wobble * ripple;
          const x = cx + Math.cos(th) * r;
          const y = cy + Math.sin(th) * r;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        if (i === 0) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
          ctx.lineWidth = 2.4;
          ctx.strokeStyle = loop.color;
          ctx.stroke();
          ctx.globalCompositeOperation = palette.dark ? "screen" : "source-over";
        } else {
          ctx.globalAlpha = palette.dark ? 0.62 : 0.5;
          ctx.fillStyle = loop.color;
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      const still = prefersStill();
      draw(now, still);
      if (!still) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
    };
  }, [size, accent, state]);

  return <canvas ref={canvas} className="ink-ring" width={size} height={size} style={{ width: size, height: size }} aria-hidden="true" />;
}
