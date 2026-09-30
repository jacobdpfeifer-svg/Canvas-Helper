/**
 * Pure writers for the two files voice sessions touch:
 * - inbox/goals.md              → `## Raw captures` (append-only; distilled by student-voice-intake)
 * - inbox/courses/CODE.md       → `## Class notes` (+ `### Mastery (self-reported)` when present)
 */
import { appendBlock, appendToSection, setUpdated } from "./md.mjs";

export const GOAL_CATEGORIES = [
  "career",
  "academic",
  "skill",
  "personal",
  "value",
  "constraint",
  "preference",
  "request",
];

export const GOAL_HORIZONS = ["now", "this_semester", "this_year", "career", "unspecified"];

/** Start of the template's own `## Distilled` blurb — boilerplate, not distilled content. */
export const DISTILLED_NOTE_PREFIX = "Agent-maintained by";

/** @param {string} day YYYY-MM-DD */
export function goalsTemplate(day) {
  return `# Goals & priorities

Updated: ${day}

Source: voice sessions (\`cd browser && npm run voice\`) + \`student-voice-intake\` distillation. The student's own words — not Canvas truth. Ranked career priorities stay in \`USER.md\`; this file holds the *why* behind them.

## Raw captures

Append-only, newest last. Written by the voice \`save_goal\` tool. Distill into the sections below with \`student-voice-intake\`.

## Distilled

${DISTILLED_NOTE_PREFIX} \`student-voice-intake\`. Keep the student's phrasing; date changes of mind instead of overwriting.

### Career & startup

### Academic

### Skills & learning

### Values & constraints

### Requests for the text agent

### Open questions
`;
}

/**
 * Collapse whitespace (also strips newlines, so a spoken line can never open a
 * new markdown block) and cap length.
 * @param {unknown} text
 * @param {number} max
 */
export function clean(text, max) {
  const s = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * @param {string} md existing goals.md ("" → template)
 * @param {{ category: string, statement: string, why?: string, horizon?: string }} entry already validated
 * @param {{ day: string, sessionId?: string }} ctx
 */
export function appendGoalCapture(md, entry, { day, sessionId }) {
  const base = md && md.trim() ? md : goalsTemplate(day);
  const horizon = entry.horizon && entry.horizon !== "unspecified" ? ` · ${entry.horizon}` : "";
  const why = entry.why ? ` — why: ${entry.why}` : "";
  const src = sessionId ? ` _(voice ${sessionId})_` : "";
  const line = `- **${day}** [${entry.category}${horizon}] ${entry.statement}${why}${src}`;
  const next = appendToSection(base, "Raw captures", 2, line) ?? appendBlock(base, `## Raw captures\n\n${line}`);
  return setUpdated(next, day);
}

/**
 * @param {string} md existing course MD
 * @param {{ note: string, gap?: string }} entry already validated
 * @param {{ day: string, sessionId?: string }} ctx
 * @returns {{ md: string, masteryAdded: boolean }}
 */
export function appendClassNote(md, { note, gap }, { day, sessionId }) {
  let next = String(md);
  let masteryAdded = false;
  if (gap) {
    const withGap = appendToSection(next, "Mastery (self-reported)", 3, `- **${day}** — ${gap}`);
    if (withGap !== null) {
      next = withGap;
      masteryAdded = true;
    }
  }
  // No mastery section in this course file: keep the gap inside the class note so it isn't lost.
  const text = gap && !masteryAdded ? `${note} Mastery gap: ${gap}` : note;
  const src = sessionId ? ` (voice: ${sessionId})` : "";
  const line = `- **${day}** — ${text}${src}`;
  next =
    appendToSection(next, "Class notes", 2, line) ??
    appendBlock(
      next,
      `## Class notes\n\nAgent-written from chat study notes, photo intake, or voice sessions (not Canvas truth).\n\n${line}`,
    );
  return { md: next, masteryAdded };
}
