/**
 * The student's own Canvas course colours (Dashboard → course card colour),
 * read with one GET to /api/v1/users/self/colors and kept locally so Blot can
 * take on a course's colour while it works on that course
 * (docs/design/blot-animation-plan-2026-09-30.md).
 *
 * Output: {user_root}/inbox/courses/colors.json → { "12345": "#e1ad49", ... }
 */
import fs from "node:fs";
import path from "node:path";

export const COLORS_PATH = "/api/v1/users/self/colors";
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Canvas `{ custom_colors: { course_123: "#abc" } }` → `{ "123": "#abc" }`, courses only, hex only. */
export function parseCourseColors(json) {
  const raw = json && typeof json === "object" ? json.custom_colors : null;
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw)) {
    const m = /^course_(\d+)$/.exec(key);
    if (!m || typeof value !== "string" || !HEX.test(value.trim())) continue;
    out[m[1]] = value.trim().toLowerCase();
  }
  return out;
}

export function courseColorsFile(userRoot) {
  return path.join(userRoot, "inbox", "courses", "colors.json");
}

/**
 * Fetch and write. Never throws: a missing colour only means Blot keeps the
 * scene signal colour.
 * @returns {Promise<{ ok: boolean, count: number, error?: string }>}
 */
export async function syncCourseColors({ page, api, userRoot }) {
  try {
    const res = await api(page, COLORS_PATH);
    if (!res?.ok) return { ok: false, count: 0, error: `colors: HTTP ${res?.status ?? 0}` };
    const colors = parseCourseColors(res.json);
    const file = courseColorsFile(userRoot);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(colors, null, 2));
    fs.renameSync(tmp, file);
    return { ok: true, count: Object.keys(colors).length };
  } catch (e) {
    return { ok: false, count: 0, error: `colors: ${e?.message || e}` };
  }
}
