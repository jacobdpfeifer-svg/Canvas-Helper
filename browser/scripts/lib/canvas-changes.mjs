/**
 * Snapshot diff: previous canonical generation vs the new one → change events.
 *
 * Assignment `updated_at` is not a usable edit signal (Canvas touches it on
 * system changes — 73 of 75 assignments in one CU course), so edits are
 * detected by comparing the fields a student cares about: due date, points,
 * and the instructions text.
 */
import crypto from "node:crypto";
import { htmlToText, normalizeTitle, previewText } from "./freshness/actions.mjs";

function descriptionHash(html) {
  const text = htmlToText(html).replace(/\s+/g, " ").trim();
  return text ? crypto.createHash("sha256").update(text).digest("hex").slice(0, 16) : null;
}

function iso(value) {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function visible(a) {
  return a && a.published !== false;
}

/**
 * @param {object|null} prev previous generation (or null on first sync)
 * @param {object} next new generation
 * @returns {object[]} events
 */
export function diffGenerations(prev, next, { now = Date.now() } = {}) {
  if (!prev || !next) return [];
  const detectedAt = new Date(now).toISOString();
  const prevCourses = new Map((prev.courses || []).map((pack) => [String(pack.course?.id), pack]));
  const events = [];
  for (const pack of next.courses || []) {
    const cid = String(pack.course?.id);
    const before = prevCourses.get(cid);
    if (!before) continue; // new enrollment: everything would look "added"
    const courseName = pack.course?.name || pack.course?.course_code || null;
    const prevById = new Map((before.assignments || []).map((a) => [String(a.id), a]));
    for (const a of pack.assignments || []) {
      if (!visible(a)) continue;
      const aid = String(a.id);
      const old = prevById.get(aid);
      const base = {
        source: "snapshot",
        course_id: cid,
        course_name: courseName,
        title: a.name || "Assignment",
        url: a.html_url || null,
        at: detectedAt,
        detected_at: detectedAt,
      };
      if (!old || !visible(old)) {
        events.push({
          ...base,
          key: `snap-added:${cid}:${aid}`,
          kind: "assignment_added",
          group: `added:${normalizeTitle(a.name)}`,
          detail: { due_at: iso(a.due_at), points_possible: a.points_possible ?? null },
        });
        continue;
      }
      const fromDue = iso(old.due_at);
      const toDue = iso(a.due_at);
      if (fromDue !== toDue) {
        events.push({
          ...base,
          key: `snap-due:${cid}:${aid}:${toDue || "none"}`,
          kind: "due_changed",
          group: `due:${normalizeTitle(a.name)}`,
          detail: { from: fromDue, to: toDue },
        });
      }
      if ((old.points_possible ?? null) !== (a.points_possible ?? null)) {
        events.push({
          ...base,
          key: `snap-points:${cid}:${aid}:${a.points_possible ?? "none"}`,
          kind: "points_changed",
          detail: { from: old.points_possible ?? null, to: a.points_possible ?? null },
        });
      }
      const oldHash = descriptionHash(old.description);
      const newHash = descriptionHash(a.description);
      if (oldHash !== newHash && newHash) {
        events.push({
          ...base,
          key: `snap-desc:${cid}:${aid}:${newHash}`,
          kind: "instructions_edited",
          detail: { preview: previewText(htmlToText(a.description), 200), first_version: !oldHash },
        });
      }
    }
  }
  return events;
}
