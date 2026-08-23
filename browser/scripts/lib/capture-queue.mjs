/**
 * Parse and update inbox/captures/queue.md (tracked intake log).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { denverDay } from "./canvas-session.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CAPTURES_ROOT = path.join(__dirname, "..", "..", "..", "inbox", "captures");
export const QUEUE_PATH = path.join(CAPTURES_ROOT, "queue.md");
export const INBOX_DIR = path.join(CAPTURES_ROOT, "inbox");
export const PROCESSED_DIR = path.join(CAPTURES_ROOT, "processed");

const HEADER_RE = /^\|\s*id\s*\|/i;

/**
 * @param {string} content
 * @returns {Array<Record<string, string>>}
 */
export function parseCaptureQueue(content) {
  const lines = String(content || "").split("\n");
  const rows = [];
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    if (HEADER_RE.test(line)) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim().replace(/\\\|/g, "|"));
    if (cells.length < 10) continue;
    rows.push({
      id: cells[0],
      captured_at: cells[1],
      course_guess: cells[2],
      confidence: cells[3],
      kind: cells[4],
      assignment_match: cells[5],
      action: cells[6],
      status: cells[7],
      local_path: cells[8],
      notes: cells[9],
      _raw: line,
    });
  }
  return rows;
}

/**
 * @param {Record<string, string>} row
 */
function rowToLine(row) {
  const esc = (s) => String(s || "").replace(/\|/g, "\\|");
  return `| ${[
    row.id,
    row.captured_at,
    row.course_guess,
    row.confidence,
    row.kind,
    row.assignment_match || "-",
    row.action,
    row.status,
    row.local_path,
    esc(row.notes),
  ].join(" | ")} |`;
}

/**
 * @param {string} content
 * @param {string} id
 * @param {Partial<Record<string, string>>} patch
 */
export function updateCaptureQueueRow(content, id, patch) {
  const rows = parseCaptureQueue(content);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return { content, found: false };
  const merged = { ...rows[idx], ...patch };
  const newLine = rowToLine(merged);
  const lines = String(content).split("\n");
  let replaced = false;
  const out = lines.map((line) => {
    if (!replaced && line.startsWith("|") && line.includes(`| ${id} |`)) {
      replaced = true;
      return newLine;
    }
    return line;
  });
  if (!replaced) return { content, found: false };
  return { content: out.join("\n"), found: true };
}

/**
 * @param {Record<string, string>} row
 */
export function appendCaptureQueueRow(content, row) {
  const line = rowToLine(row);
  const trimmed = String(content || "").trimEnd();
  if (!trimmed.includes("| id |")) {
    throw new Error("queue.md missing header table");
  }
  return `${trimmed}\n${line}\n`;
}

export function readCaptureQueue() {
  return fs.readFileSync(QUEUE_PATH, "utf8");
}

export function writeCaptureQueue(content) {
  fs.mkdirSync(CAPTURES_ROOT, { recursive: true });
  fs.writeFileSync(QUEUE_PATH, content, "utf8");
}

/**
 * @param {string} localPath e.g. inbox/{id}.jpg
 */
export function resolveCaptureFile(localPath) {
  const base = path.basename(localPath, path.extname(localPath));
  const dir = INBOX_DIR;
  for (const ext of [".jpg", ".jpeg", ".png", ".heic", ".webp"]) {
    const full = path.join(dir, `${base}${ext}`);
    if (fs.existsSync(full)) return full;
  }
  const direct = path.join(CAPTURES_ROOT, localPath);
  if (fs.existsSync(direct)) return direct;
  return null;
}

/**
 * @param {string} courseCode
 * @returns {string|null}
 */
export function courseMdPath(courseCode) {
  if (!courseCode || courseCode === "UNKNOWN") return null;
  const p = path.join(CAPTURES_ROOT, "..", "courses", `${courseCode}.md`);
  return fs.existsSync(p) ? p : null;
}

/**
 * @param {string} content
 */
export function parseCourseIdFromMd(content) {
  const m = String(content).match(/Canvas URL:\s*https:\/\/canvas\.colorado\.edu\/courses\/(\d+)/i);
  return m ? m[1] : null;
}

/**
 * @param {string} content
 * @param {string} namePattern
 */
export function findAssignmentIdInCourseMd(content, namePattern) {
  const needle = String(namePattern || "").toLowerCase();
  if (!needle || needle === "-") return null;
  const lines = String(content).split("\n");
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    if (/^\|\s*Name\s*\|/i.test(line)) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue;
    const cells = line.slice(1, -1).split("|").map((c) => c.trim());
    if (cells.length < 2) continue;
    const name = cells[0];
    if (!name.toLowerCase().includes(needle) && !needle.includes(name.toLowerCase())) continue;
    const urlMatch = line.match(/canvas\.colorado\.edu\/(?:courses\/\d+\/)?assignments\/(\d+)/i);
    if (urlMatch) return urlMatch[1];
  }
  return null;
}

export function touchQueueUpdated(content) {
  const today = denverDay();
  return String(content).replace(/^Updated:\s*.+$/m, `Updated: ${today}`);
}
