/**
 * One Blot: machine (timing) + body (physics) + renderer, behind two calls.
 *
 *   const blot = createBlot();
 *   // every frame:
 *   blot.update({ state, level, items }, dt);
 *   blot.draw(ctx, width, height, { ink, shadow });
 *
 * Pass { still: true } to both for reduced motion: the held pose per state,
 * no physics, no hop, no blink.
 */
import { createBody } from "./body.js";
import { createMachine } from "./machine.js";
import { drawBlot, drawStamp, layout } from "./render.js";
import { STAMP_LIFE } from "./poses.js";

export function createBlot({ seed = 1 } = {}) {
  const machine = createMachine({ seed });
  const body = createBody({});
  let frame = machine.update({ state: "idle" }, 0, { still: true });
  let stamps = [];
  let stampSeed = seed;
  let first = true;

  return {
    update(input, dt, { still = false } = {}) {
      frame = machine.update(input, dt, { still });
      if (still || first) {
        body.snap(frame.pose);
        first = false;
      } else {
        for (const ev of frame.events) {
          if (ev.kind === "stamp") stamps.push({ age: 0, seed: (stampSeed = (stampSeed * 7 + 3) % 97) });
          else body.impulse(ev.kind, ev.strength);
        }
        body.step(dt, frame.pose);
      }
      stamps = still ? [] : stamps.map((s) => ({ ...s, age: s.age + dt })).filter((s) => s.age < STAMP_LIFE);
      return frame;
    },
    draw(ctx, w, h, colors, { still = false } = {}) {
      const place = layout(w, h);
      for (const s of stamps) drawStamp(ctx, { x: place.x, floor: place.floor, R: place.R, color: colors.ink, alpha: 0.5 * (1 - s.age / STAMP_LIFE), seed: s.seed });
      if (still && frame.state === "done") drawStamp(ctx, { x: place.x, floor: place.floor, R: place.R, color: colors.ink, alpha: 0.35, seed: 3 });
      drawBlot(ctx, body.points, frame, { ...place, ink: colors.ink, shadow: colors.shadow });
    },
    poke(strength) {
      machine.poke(strength);
    },
    get frame() {
      return frame;
    },
    get points() {
      return body.points;
    },
  };
}
