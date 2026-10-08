/**
 * Kairos toolbar icons (MASTER §08: no mascot): an ink rounded square with a
 * highlighter-yellow "k". Rasterized here with 4x4 supersampling so every size
 * is sharp, written as dependency-free PNGs.
 *
 *   node app/extension-chrome/tools/kairos-icons.mjs          # write icons/
 *   node app/extension-chrome/tools/kairos-icons.mjs --check  # exit 1 if icons/ is stale
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

export const INK = [0x1d, 0x1d, 0x1f];
export const HL = [0xff, 0xe1, 0x4d];
export const SIZES = [16, 32, 48, 128];

const here = path.dirname(fileURLToPath(import.meta.url));
export const ICON_DIR = path.resolve(here, "..", "icons");

/** Shapes in a 0..1 unit square. */
function inRoundedSquare(x, y, r = 0.22) {
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
function nearSegment(x, y, [ax, ay], [bx, by], halfWidth) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return (x - (ax + t * dx)) ** 2 + (y - (ay + t * dy)) ** 2 <= halfWidth * halfWidth;
}
const W = 0.075; // stroke half-width of the "k"
const STROKES = [
  [[0.36, 0.22], [0.36, 0.78]], // stem
  [[0.39, 0.56], [0.67, 0.3]], // upper arm
  [[0.47, 0.49], [0.69, 0.78]], // leg
];
function inK(x, y) {
  return STROKES.some(([a, b]) => nearSegment(x, y, a, b, W));
}

export function rasterize(size) {
  const px = Buffer.alloc(size * size * 4);
  const S = 4;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let bg = 0;
      let k = 0;
      for (let sj = 0; sj < S; sj++) {
        for (let si = 0; si < S; si++) {
          const x = (i + (si + 0.5) / S) / size;
          const y = (j + (sj + 0.5) / S) / size;
          if (!inRoundedSquare(x, y)) continue;
          bg++;
          if (inK(x, y)) k++;
        }
      }
      const n = S * S;
      const a = bg / n;
      const mix = bg ? k / bg : 0;
      const o = (j * size + i) * 4;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(INK[c] * (1 - mix) + HL[c] * mix);
      px[o + 3] = Math.round(a * 255);
    }
  }
  return px;
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
export function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  let stale = false;
  fs.mkdirSync(ICON_DIR, { recursive: true });
  for (const size of SIZES) {
    const file = path.join(ICON_DIR, `kairos-${size}.png`);
    const png = encodePng(size, rasterize(size));
    if (check) {
      if (!fs.existsSync(file) || !fs.readFileSync(file).equals(png)) {
        console.error(`stale: icons/kairos-${size}.png`);
        stale = true;
      }
    } else {
      fs.writeFileSync(file, png);
    }
  }
  if (stale) process.exit(1);
}
