// GENERATED from app/src/blot/core/machine.js by tools/vendor-shared.mjs — edit the source, not this copy.
/**
 * Voice state → what Blot should be doing this frame.
 *
 * The machine never changes the voice state itself; the voice session owns
 * that. It only adds Blot's timing on top: anticipation before the done-hop,
 * a pinch before each drop leaves, dozing after a quiet stretch, and the
 * events (land, stretch, pinch, poke, stamp) that kick the soft body.
 */
import { POSES, BREATH_AMP, BREATH_HZ, DOZE_AFTER, HOP, SHRINK_PER_DROP, MAX_SHRINK } from "./poses.js";
import { answerTimeline, PINCH } from "./timeline.js";

export const STATES = ["idle", "listening", "thinking", "speaking", "done", "error"];
const MAX_BANDS = 4;
const STILL_LEVEL = 0.35;

/** Small seeded PRNG so blink timing is reproducible in tests. */
export function seededRandom(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const ease = (dt, tau) => 1 - Math.exp(-Math.max(dt, 0) / tau);
const mix = (a, b, k) => a + (b - a) * k;

function normalizeState(state) {
  return STATES.includes(state) ? state : "idle";
}

export function createMachine({ seed = 1 } = {}) {
  const random = seededRandom(seed);
  let state = "idle";
  let stateT = 0;
  let idleT = 0;
  let clock = 0;
  let doze = 0;
  let pokeT = 0;
  let lastLevel = 0;
  let dropsGiven = 0;
  let shrink = 0;
  let landed = false;
  let blinkIn = 2 + random() * 2;
  let blinkT = -1;
  let big = 1;
  let open = 0;
  const gaze = [0, 0];
  let bands = [];
  let pendingPoke = 0;

  function enter(next) {
    state = next;
    stateT = 0;
    idleT = 0;
    landed = false;
    dropsGiven = 0;
    if (next === "listening") bands = [];
  }

  /**
   * @param {{ state?: string, level?: number, items?: { title: string, color?: string }[], gaze?: [number, number] }} input
   * @param {number} dt seconds since the last update
   * @param {{ still?: boolean }} [opts] still: reduced motion — the held pose for the state, no time effects
   */
  function update(input, dt, { still = false } = {}) {
    const events = [];
    const next = normalizeState(input?.state);
    if (next !== state) {
      enter(next);
      if (!still) events.push({ kind: "poke", strength: 0.5 });
    }
    const items = Array.isArray(input?.items) ? input.items : [];
    const level = still ? (state === "listening" || state === "speaking" ? STILL_LEVEL : 0) : Math.max(0, Math.min(1, Number(input?.level) || 0));

    if (!still) {
      stateT += dt;
      clock += dt;
    } else {
      stateT = state === "done" ? HOP.crouch + HOP.air + 1 : 0;
    }

    if (pendingPoke) {
      events.push({ kind: "poke", strength: pendingPoke });
      pendingPoke = 0;
      pokeT = 0.6;
      idleT = 0;
    }
    pokeT = Math.max(0, pokeT - dt);

    // dozing: only from a quiet idle, and any voice or poke wakes it
    if (state === "idle" && !still) idleT += dt;
    const wantDoze = state === "idle" && idleT > DOZE_AFTER ? 1 : 0;
    doze = still ? 0 : mix(doze, wantDoze, ease(dt, wantDoze ? 1.2 : 0.15));

    const base = POSES[state];
    const pose = {
      sx: base.sx + (base.levelSx || 0) * level,
      sy: base.sy + (base.levelSy || 0) * level,
      tilt: base.tilt + (state === "speaking" && items.length ? base.writingTilt || 0 : 0),
      bend: base.bend || 0,
      sag: 0,
      shrink: 0,
      nib: true,
    };
    if (base.bendSway) pose.bend = still ? base.bendSway * 0.6 : base.bendSway * Math.sin(clock * 3);
    if (state === "idle" && !still) {
      const b = BREATH_AMP * Math.sin(clock * Math.PI * 2 * BREATH_HZ);
      pose.sx -= b;
      pose.sy += b;
    }

    // done: crouch (anticipation) → airborne stretch → land → hold
    let hop = 0;
    if (state === "done") {
      if (stateT < HOP.crouch) {
        pose.sx = 1.1;
        pose.sy = 0.86;
      } else if (stateT < HOP.crouch + HOP.air) {
        const f = (stateT - HOP.crouch) / HOP.air;
        hop = Math.sin(f * Math.PI) * HOP.height;
        pose.sx = 0.94;
        pose.sy = 1.08;
      } else if (!landed) {
        landed = true;
        if (!still) {
          events.push({ kind: "land", strength: 2.2 });
          events.push({ kind: "stamp" });
        }
      }
    }

    // loud syllables stretch the body a little
    if (!still && (state === "speaking" || state === "listening") && level - lastLevel > 0.1) {
      events.push({ kind: "stretch", strength: Math.min(1, (level - lastLevel) * 4) });
    }
    lastLevel = level;

    // drops: pinch, then give one drop per item
    const timeline = state === "speaking" ? answerTimeline(items) : [];
    if (state === "speaking" && !still) {
      const prevT = stateT - dt;
      for (const entry of timeline) {
        if (prevT < entry.launchAt - PINCH && stateT >= entry.launchAt - PINCH) events.push({ kind: "pinch", strength: 1.6 });
        if (prevT < entry.launchAt && stateT >= entry.launchAt) dropsGiven++;
      }
    }
    const wantShrink = state === "speaking" ? Math.min(MAX_SHRINK, dropsGiven * SHRINK_PER_DROP) : 0;
    shrink = still ? 0 : mix(shrink, wantShrink, ease(dt, wantShrink > shrink ? 0.12 : 0.6));
    pose.shrink = shrink;

    // course colours: soaked up while thinking, carried out one band per drop
    const colors = items.slice(0, MAX_BANDS).map((it) => it?.color).filter((c) => typeof c === "string" && c);
    if (bands.length !== colors.length) bands = colors.map((color, i) => ({ color, amount: bands[i]?.amount ?? 0 }));
    bands.forEach((band, i) => {
      band.color = colors[i];
      let want = 0;
      if (state === "thinking") want = still ? 1 : Math.min(1, stateT / 1.3);
      if (state === "speaking") want = i < dropsGiven ? 0 : 1;
      band.amount = still ? want : mix(band.amount, want, ease(dt, want > band.amount ? 0.15 : 0.2));
    });

    // dozing blends every pose number toward the puddle
    if (doze > 0.001) {
      const d = POSES.dozing;
      pose.sx = mix(pose.sx, d.sx, doze);
      pose.sy = mix(pose.sy, d.sy, doze);
      pose.bend = mix(pose.bend, d.bend, doze);
      pose.sag = doze;
    }

    // face
    let eyes = base.eyes;
    let mouth = base.mouth;
    let bigTarget = base.big;
    if (doze > 0.5) {
      eyes = "closed";
      mouth = "none";
    }
    if (pokeT > 0) {
      bigTarget = 1.3;
      mouth = "o";
      if (eyes === "closed") eyes = "open";
    }
    big = still ? bigTarget : mix(big, bigTarget, ease(dt, 0.08));
    open = still ? level : mix(open, level, ease(dt, 0.04));
    const gz = input?.gaze || base.gaze;
    gaze[0] = still ? gz[0] : mix(gaze[0], gz[0], ease(dt, 0.06));
    gaze[1] = still ? gz[1] : mix(gaze[1], gz[1], ease(dt, 0.06));

    let blink = 0;
    if (!still && eyes === "open") {
      blinkIn -= dt;
      if (blinkIn <= 0) {
        blinkT = 0;
        blinkIn = 2.5 + random() * 3;
      }
      if (blinkT >= 0) {
        blinkT += dt;
        blink = blinkT < 0.07 ? blinkT / 0.07 : Math.max(0, 1 - (blinkT - 0.07) / 0.08);
        if (blinkT > 0.15) blinkT = -1;
      }
    }

    return {
      state,
      label: doze > 0.5 ? "dozing" : state,
      stateT,
      pose,
      hop,
      face: { eyes, mouth, big, open, blink, gaze: [gaze[0], gaze[1]] },
      bands: bands.map((b) => ({ color: b.color, amount: b.amount })),
      events,
      timeline,
    };
  }

  return {
    update,
    /** A click or tap on Blot. Wakes it and makes it wobble. */
    poke(strength = 2.2) {
      pendingPoke = strength;
    },
    get state() {
      return state;
    },
  };
}
