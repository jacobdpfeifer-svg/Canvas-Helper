/**
 * Pixel Blot: the 16×16 hand-cleaned mark, written as the extension's PNG
 * icons (nearest-neighbour scaled, so every size is the same pixel drawing).
 *
 *   node app/extension-chrome/tools/blot-icons.mjs          # write icons/
 *   node app/extension-chrome/tools/blot-icons.mjs --check  # exit 1 if icons/ is stale
 *
 * # ink · transparent. The tuft carries the breather hole; eyes and mouth are
 * holes, like the animated Blot, so the icon works on any toolbar colour.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

export const PIXEL_BLOT = [
  "................",
  ".......##.......",
  ".......##.......",
  "......####......",
  ".....######.....",
  "....###..###....",
  "...##########...",
  "..############..",
  "..############..",
  ".####.####.####.",
  ".####.####.####.",
  ".##############.",
  "..#####..#####..",
  "..############..",
  "...##########...",
  ".....######.....",
];
export const INK = [0x37, 0x67, 0xff, 0xff]; // --signal-cobalt
export const SIZES = [16, 32, 48, 128];

const here = path.dirname(fileURLToPath(import.meta.url));
export const ICON_DIR = path.resolve(here, "..", "icons");

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

/** RGBA PNG of the pixel map at `size` px. Deterministic bytes. */
export function blotPng(size) {
  const scale = size / 16;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const on = PIXEL_BLOT[Math.floor(y / scale)][Math.floor(x / scale)] === "#";
      if (on) raw.set(INK, row + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes("--check");
  let stale = false;
  fs.mkdirSync(ICON_DIR, { recursive: true });
  for (const size of SIZES) {
    const file = path.join(ICON_DIR, `blot-${size}.png`);
    const want = blotPng(size);
    const have = fs.existsSync(file) ? fs.readFileSync(file) : null;
    if (have && have.equals(want)) continue;
    stale = true;
    if (check) console.error(`stale: icons/blot-${size}.png`);
    else fs.writeFileSync(file, want);
  }
  if (check && stale) process.exit(1);
}
