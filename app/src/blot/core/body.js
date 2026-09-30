/**
 * Blot's body: a pressurised soft ring (JellyCar / LocoRoco style).
 *
 * N points around the outline, in body units (rest radius 1, origin at the
 * body centre, y down, floor at y = +1). Each substep applies:
 *   - shape matching toward the posed rest outline (keeps the nib tuft),
 *   - edge springs between neighbours,
 *   - gas pressure along the outward normal (keeps the area constant, so a
 *     squash one way bulges the other way on its own),
 *   - velocity damping.
 * The nib points match their target more loosely, so the tuft trails the body.
 *
 * Dependency-free: vendored into the Chrome extension by
 * app/extension-chrome/tools/vendor-shared.mjs.
 */

export const POINTS = 48;
const STEP = 1 / 120;
const NIB_WIDTH = 0.045; // gaussian variance, radians²

const K_SHAPE = 170;
const K_EDGE = 260;
const K_PRESSURE = 55;
const DAMPING = 9;
const NIB_LAG = 0.65; // share of shape stiffness the tuft loses

/** Angle of point i; i = POINTS / 4 sits at the top (-π/2). */
export function angleOf(i, n = POINTS) {
  return -Math.PI + (i / n) * Math.PI * 2;
}

export const NIB_INDEX = POINTS / 4;

/** Weight 0..1 of how much point i belongs to the tuft. */
export function nibWeight(i, n = POINTS) {
  let d = angleOf(i, n) + Math.PI / 2;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.exp(-(d * d) / NIB_WIDTH);
}

/**
 * The posed rest outline.
 * @param {{ sx?: number, sy?: number, tilt?: number, bend?: number, sag?: number, nib?: boolean, shrink?: number }} pose
 * @returns {Float64Array} xy pairs
 */
export function targetOutline(pose = {}, n = POINTS) {
  const { sx = 1, sy = 1, tilt = 0, bend = 0, sag = 0, nib = true, shrink = 0 } = pose;
  const amp = (nib ? 0.42 : 0.34) * (1 - sag * 0.7);
  const scale = 1 - shrink;
  const out = new Float64Array(n * 2);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  for (let i = 0; i < n; i++) {
    const w = nibWeight(i, n);
    const th = angleOf(i, n) + bend * w;
    const r = (1 + amp * w) * scale;
    let x = Math.cos(th) * r;
    let y = Math.sin(th) * r + (1 - scale); // keep the floor at y = 1 when shrunk
    // squash and stretch about the floor contact point
    x *= sx;
    y = 1 + (y - 1) * sy;
    // tilt about the floor contact point
    const dy = y - 1;
    out[i * 2] = x * ct - dy * st;
    out[i * 2 + 1] = 1 + x * st + dy * ct;
  }
  return out;
}

/** Shoelace area of an xy-pair polygon. */
export function areaOf(xy) {
  const n = xy.length / 2;
  let a = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += xy[i * 2] * xy[j * 2 + 1] - xy[j * 2] * xy[i * 2 + 1];
  }
  return Math.abs(a) / 2;
}

export function createBody(pose = {}) {
  const n = POINTS;
  const p = Float64Array.from(targetOutline(pose, n));
  const v = new Float64Array(n * 2);
  const f = new Float64Array(n * 2);
  let acc = 0;

  function substep(target) {
    const restArea = areaOf(target);
    const area = areaOf(p);
    const pressure = K_PRESSURE * (restArea / Math.max(area, 1e-6) - 1);
    f.fill(0);
    for (let i = 0; i < n; i++) {
      const k = K_SHAPE * (1 - NIB_LAG * nibWeight(i, n));
      f[i * 2] += k * (target[i * 2] - p[i * 2]) - DAMPING * v[i * 2];
      f[i * 2 + 1] += k * (target[i * 2 + 1] - p[i * 2 + 1]) - DAMPING * v[i * 2 + 1];
      // outward normal from the neighbours (points run counter-clockwise on screen)
      const a = (i - 1 + n) % n;
      const b = (i + 1) % n;
      let nx = p[b * 2 + 1] - p[a * 2 + 1];
      let ny = -(p[b * 2] - p[a * 2]);
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
      const cx = p[i * 2];
      const cy = p[i * 2 + 1] - 0; // body centre is ~origin; flip normal if it points inward
      if (nx * cx + ny * cy < 0) {
        nx = -nx;
        ny = -ny;
      }
      f[i * 2] += pressure * nx;
      f[i * 2 + 1] += pressure * ny;
      // edge spring to the next point
      const dx = p[b * 2] - p[i * 2];
      const dy = p[b * 2 + 1] - p[i * 2 + 1];
      const d = Math.hypot(dx, dy) || 1e-6;
      const rest = Math.hypot(target[b * 2] - target[i * 2], target[b * 2 + 1] - target[i * 2 + 1]);
      const s = (K_EDGE * (d - rest)) / d;
      f[i * 2] += s * dx;
      f[i * 2 + 1] += s * dy;
      f[b * 2] -= s * dx;
      f[b * 2 + 1] -= s * dy;
    }
    for (let i = 0; i < n * 2; i++) {
      v[i] += f[i] * STEP;
      p[i] += v[i] * STEP;
    }
  }

  return {
    points: p,
    /** Advance by dt seconds toward the given pose, in fixed 120 Hz substeps. */
    step(dt, nextPose) {
      const target = targetOutline(nextPose, n);
      acc = Math.min(acc + dt, 0.1);
      while (acc >= STEP) {
        substep(target);
        acc -= STEP;
      }
    },
    /** Jump straight to the pose with no motion (reduced motion, first frame). */
    snap(nextPose) {
      p.set(targetOutline(nextPose, n));
      v.fill(0);
      acc = 0;
    },
    /**
     * Add velocity for a named event.
     * land: squash down and out. stretch: the reverse (loud syllable).
     * poke: a wobble around the rim. pinch: pull the tuft up before a drop leaves.
     */
    impulse(kind, strength = 1) {
      for (let i = 0; i < n; i++) {
        const x = p[i * 2];
        const y = p[i * 2 + 1];
        const th = angleOf(i, n);
        if (kind === "land" || kind === "stretch") {
          const s = kind === "land" ? strength : -strength;
          v[i * 2] += s * x * 0.9;
          v[i * 2 + 1] += s * 0.7 * (1 - y);
        } else if (kind === "poke") {
          const w = Math.sin(th * 3);
          v[i * 2] += strength * Math.cos(th) * w;
          v[i * 2 + 1] += strength * Math.sin(th) * w;
        } else if (kind === "pinch") {
          v[i * 2 + 1] -= strength * nibWeight(i, n) * 1.5;
        }
      }
    },
    area() {
      return areaOf(p);
    },
  };
}
