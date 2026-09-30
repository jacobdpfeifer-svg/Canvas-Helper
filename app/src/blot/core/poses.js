/**
 * Tuned numbers per state, taken from the character sheet
 * (docs/design/blot-animation-plan-2026-09-30.md). `level` terms scale with
 * the smoothed voice level; everything else is the held pose.
 *
 * eyes: "open" | "happy" | "closed"; mouth: "smile" | "o" | "talk" | "flat" | "none".
 * gaze is in body units, applied to the eyes with a short lag.
 */
export const POSES = {
  idle: { sx: 1, sy: 1, tilt: 0, bend: 0, eyes: "open", big: 1, mouth: "smile", gaze: [0, 0] },
  listening: { sx: 1, sy: 1, levelSx: 0.1, levelSy: -0.06, tilt: -0.08, bend: -0.1, eyes: "open", big: 1.22, mouth: "o", gaze: [0, -0.04] },
  thinking: { sx: 1, sy: 1, tilt: 0.02, bendSway: 0.45, eyes: "open", big: 1, mouth: "flat", gaze: [0.12, -0.12] },
  speaking: { sx: 1, sy: 1, levelSx: -0.08, levelSy: 0.14, tilt: 0, writingTilt: 0.12, bend: 0.08, eyes: "open", big: 1, mouth: "talk", gaze: [0.04, 0] },
  done: { sx: 1, sy: 1, tilt: 0, bend: 0, eyes: "happy", big: 1, mouth: "smile", gaze: [0, 0] },
  error: { sx: 0.98, sy: 1.02, tilt: -0.05, bend: -0.2, eyes: "open", big: 0.9, mouth: "flat", gaze: [-0.06, 0.06] },
  dozing: { sx: 1.28, sy: 0.6, tilt: 0, bend: 0.5, sag: 1, eyes: "closed", big: 1, mouth: "none", gaze: [0, 0] },
};

export const BREATH_HZ = 0.6;
export const BREATH_AMP = 0.02;
export const DOZE_AFTER = 8; // seconds of idle before Blot settles into a puddle
export const HOP = { crouch: 0.12, air: 0.38, height: 0.4 }; // done: anticipation, airtime, height in body radii
export const STAMP_LIFE = 5;
export const SHRINK_PER_DROP = 0.06;
export const MAX_SHRINK = 0.24;
