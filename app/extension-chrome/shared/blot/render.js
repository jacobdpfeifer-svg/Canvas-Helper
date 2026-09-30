// GENERATED from app/src/blot/core/render.js by tools/vendor-shared.mjs — edit the source, not this copy.
/**
 * Canvas2D drawing for Blot. Everything cut out of the ink (eyes, mouth, nib
 * slit and breather hole) is a real hole (destination-out), so the surface
 * behind shows through in every theme and Blot needs only one colour.
 */
import { NIB_INDEX, POINTS, nibWeight } from "./body.js";

const FILL_HEIGHT = 0.62; // course colours fill at most this far up, in body radii

/** Closed Catmull-Rom spline through screen points. */
function tracePath(ctx, pts) {
  const n = pts.length / 2;
  const px = (i) => pts[((i + n) % n) * 2];
  const py = (i) => pts[((i + n) % n) * 2 + 1];
  ctx.beginPath();
  ctx.moveTo(px(0), py(0));
  for (let i = 0; i < n; i++) {
    const c1x = px(i) + (px(i + 1) - px(i - 1)) / 6;
    const c1y = py(i) + (py(i + 1) - py(i - 1)) / 6;
    const c2x = px(i + 1) - (px(i + 2) - px(i)) / 6;
    const c2y = py(i + 1) - (py(i + 2) - py(i)) / 6;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, px(i + 1), py(i + 1));
  }
  ctx.closePath();
}

/** Where the face goes: the box around the non-tuft outline, in body units. */
export function faceFrame(points) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const n = points.length / 2;
  for (let i = 0; i < n; i++) {
    if (nibWeight(i, n) > 0.2) continue;
    const x = points[i * 2];
    const y = points[i * 2 + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, hw: (maxX - minX) / 2, hh: (maxY - minY) / 2 };
}

/**
 * Layout for a canvas of w×h CSS pixels: leaves room above for the tuft and
 * the hop, and below for the shadow and stamp ring.
 */
export function layout(w, h) {
  const R = Math.max(1, Math.min(w / 3, h / 3.2));
  return { R, x: w / 2, floor: h - R * 0.3 };
}

function eyeShape(ctx, x, y, w, h, closed) {
  ctx.beginPath();
  ctx.ellipse(x, y, w, Math.max(h * (1 - closed), w * 0.28), 0, 0, Math.PI * 2);
  ctx.fill();
}

function arcEye(ctx, x, y, w, lw) {
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x, y + w * 0.5, w, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

function lidEye(ctx, x, y, w, lw) {
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x, y + w * 0.5, x + w, y);
  ctx.stroke();
}

/** A fading ink ring pressed into the floor when a task lands. */
export function drawStamp(ctx, { x, floor, R, color, alpha, seed = 0 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, R * 0.05);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const j = 1 + 0.04 * Math.sin(a * 5 + seed) + 0.03 * Math.sin(a * 11 + seed * 2);
    const px = x + Math.cos(a) * R * 1.25 * j;
    const py = floor + Math.sin(a) * R * 0.2 * j;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.25;
  ctx.fill();
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Float64Array} points body outline in body units
 * @param {ReturnType<import("./machine.js").createMachine>["update"] extends (...a: any) => infer F ? F : never} frame
 * @param {{ x: number, floor: number, R: number, ink: string, shadow?: string }} place
 */
export function drawBlot(ctx, points, frame, place) {
  const { x, floor, R, ink, shadow } = place;
  const n = points.length / 2;
  const lift = (frame.hop || 0) * R;
  const sp = new Float64Array(points.length);
  for (let i = 0; i < n; i++) {
    sp[i * 2] = x + points[i * 2] * R;
    sp[i * 2 + 1] = floor + (points[i * 2 + 1] - 1) * R - lift;
  }
  const ff = faceFrame(points);

  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(x + ff.cx * R, floor + 2, ff.hw * R * 0.85 * (1 - (frame.hop || 0) * 0.6), R * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  tracePath(ctx, sp);
  ctx.fillStyle = ink;
  ctx.fill();

  // course colours, stacked from the bottom with a wavy surface
  const bands = (frame.bands || []).filter((b) => b.amount > 0.005);
  if (bands.length) {
    ctx.save();
    tracePath(ctx, sp);
    ctx.clip();
    // liquid sits in the lower body and never reaches the eyes
    const bottom = floor - lift;
    const share = (FILL_HEIGHT * R * (frame.pose?.sy || 1)) / Math.max(1, frame.bands.length);
    let y0 = bottom + R * 0.05;
    frame.bands.forEach((band, k) => {
      const hgt = band.amount * share;
      if (hgt <= 0.2) return;
      const y1 = y0 - hgt;
      ctx.fillStyle = band.color;
      ctx.beginPath();
      ctx.moveTo(x - R * 2, y0);
      for (let px = -2; px <= 2.001; px += 0.1) ctx.lineTo(x + px * R, y1 + Math.sin(px * 5 + (frame.stateT || 0) * 3 + k) * R * 0.035);
      ctx.lineTo(x + R * 2, y0);
      ctx.closePath();
      ctx.fill();
      y0 = y1;
    });
    ctx.restore();
  }

  // holes
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";

  // nib: slit from the tip toward the body, then the breather hole
  const tipX = sp[NIB_INDEX * 2];
  const tipY = sp[NIB_INDEX * 2 + 1];
  const cx = x + ff.cx * R;
  const cy = floor + (ff.cy - 1) * R - lift;
  let dx = cx - tipX;
  let dy = cy - tipY;
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl;
  dy /= dl;
  if ((frame.pose?.sag || 0) < 0.6) {
    // a puddled Blot has no tuft left to slit
    ctx.lineWidth = R * 0.045;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tipX + dx * R * 0.03, tipY + dy * R * 0.03);
    ctx.lineTo(tipX + dx * R * 0.48, tipY + dy * R * 0.48);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tipX + dx * R * 0.58, tipY + dy * R * 0.58, R * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  const f = frame.face;
  const sag = frame.pose?.sag || 0;
  const hw = ff.hw * R;
  const ex = hw * 0.34;
  const ey = cy + R * (0.02 + sag * 0.22);
  const gx = (f.gaze?.[0] || 0) * R;
  const gy = (f.gaze?.[1] || 0) * R;
  if (f.eyes === "happy") {
    arcEye(ctx, cx - ex, ey, R * 0.12, R * 0.075);
    arcEye(ctx, cx + ex, ey, R * 0.12, R * 0.075);
  } else if (f.eyes === "closed") {
    lidEye(ctx, cx - ex, ey + R * 0.04, R * 0.1, R * 0.06);
    lidEye(ctx, cx + ex, ey + R * 0.04, R * 0.1, R * 0.06);
  } else {
    const w = R * 0.085 * f.big;
    const h = R * 0.155 * f.big;
    eyeShape(ctx, cx - ex + gx, ey + gy, w, h, f.blink || 0);
    eyeShape(ctx, cx + ex + gx, ey + gy, w, h, f.blink || 0);
  }
  const my = cy + R * (0.36 + sag * 0.18);
  ctx.lineWidth = R * 0.06;
  if (f.mouth === "talk") {
    ctx.beginPath();
    ctx.ellipse(cx + gx * 0.5, my, R * (0.1 + f.open * 0.06), R * (0.025 + f.open * 0.17), 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (f.mouth === "o") {
    ctx.beginPath();
    ctx.ellipse(cx, my, R * 0.05, R * (0.05 + f.open * 0.03), 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (f.mouth === "flat") {
    ctx.beginPath();
    ctx.moveTo(cx + R * 0.02, my);
    ctx.lineTo(cx + R * 0.18, my - R * 0.03);
    ctx.stroke();
  } else if (f.mouth === "smile") {
    ctx.beginPath();
    ctx.arc(cx, my - R * 0.1, R * 0.12, Math.PI * 0.25, Math.PI * 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

export { POINTS };
