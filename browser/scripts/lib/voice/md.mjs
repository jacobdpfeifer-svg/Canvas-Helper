/**
 * Fence-aware markdown section helpers for inbox/*.md (pure string in, string out).
 */

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*$/;

/**
 * Heading lines outside fenced code blocks, so `# comment` inside a code fence
 * is never mistaken for a section.
 * @param {string[]} lines
 * @returns {Array<{ index: number, level: number, text: string }>}
 */
function headings(lines) {
  const out = [];
  let fenced = false;
  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    const m = HEADING_RE.exec(line);
    if (m) out.push({ index, level: m[1].length, text: m[2] });
  });
  return out;
}

/**
 * @param {string[]} lines
 * @param {string} headingText
 * @param {number} level
 * @returns {{ start: number, end: number } | null} start = heading line, end = first line after the section body
 */
function locate(lines, headingText, level) {
  const hs = headings(lines);
  const want = headingText.trim().toLowerCase();
  const at = hs.findIndex((h) => h.level === level && h.text.trim().toLowerCase() === want);
  if (at < 0) return null;
  const next = hs.slice(at + 1).find((h) => h.level <= level);
  return { start: hs[at].index, end: next ? next.index : lines.length };
}

/**
 * @param {string} md
 * @param {string} headingText
 * @param {number} [level]
 * @returns {string | null} section body (without the heading line), or null when absent
 */
export function extractSection(md, headingText, level = 2) {
  const lines = String(md || "").split("\n");
  const loc = locate(lines, headingText, level);
  if (!loc) return null;
  return lines
    .slice(loc.start + 1, loc.end)
    .join("\n")
    .trim();
}

/**
 * Append `line` after the last non-blank line of a section, keeping the blank
 * line that separates it from the next heading.
 * @param {string} md
 * @param {string} headingText
 * @param {number} level
 * @param {string} line
 * @returns {string | null} updated markdown, or null when the section is absent
 */
export function appendToSection(md, headingText, level, line) {
  const lines = String(md || "").split("\n");
  const loc = locate(lines, headingText, level);
  if (!loc) return null;
  let last = -1;
  for (let i = loc.end - 1; i > loc.start; i--) {
    if (lines[i].trim() !== "") {
      last = i;
      break;
    }
  }
  if (last < 0) lines.splice(loc.start + 1, 0, "", line);
  else lines.splice(last + 1, 0, line);
  return lines.join("\n");
}

/**
 * @param {string} md
 * @param {string} block
 * @returns {string} md with `block` added at the end, blank-line separated, single trailing newline
 */
export function appendBlock(md, block) {
  const base = String(md || "").replace(/\s+$/, "");
  return `${base}${base ? "\n\n" : ""}${block.replace(/\s+$/, "")}\n`;
}

/**
 * @param {string} md
 * @param {string} day YYYY-MM-DD
 * @returns {string} md with the `Updated:` header line refreshed (unchanged when absent)
 */
export function setUpdated(md, day) {
  return String(md).replace(/^Updated:.*$/m, `Updated: ${day}`);
}
