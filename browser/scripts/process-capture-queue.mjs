#!/usr/bin/env node
/**
 * Process pending_mac rows in inbox/captures/queue.md — preview only.
 *
 * Canvas-focus pivot: never uploads or submits to Canvas. Match course /
 * assignment and show what the student should upload themselves.
 *
 * Usage:
 *   node scripts/process-capture-queue.mjs [--dry-run] [--id CAPTURE_ID]
 */
import fs from "node:fs";
import path from "node:path";
import {
  courseMdPath,
  parseCaptureQueue,
  parseCourseIdFromMd,
  readCaptureQueue,
  resolveCaptureFile,
} from "./lib/capture-queue.mjs";
import { previewCaptureSubmit } from "./lib/capture-upload.mjs";
import {
  apiAllPages,
  launchCanvasContext,
  requireLoggedIn,
} from "./lib/canvas-session.mjs";

const args = process.argv.slice(2);
const idFlag = args.indexOf("--id");
const onlyId = idFlag >= 0 ? args[idFlag + 1] : null;

function usage() {
  console.log(`Usage: npm run process-capture-queue [-- --dry-run] [-- --id CAPTURE_ID]

Preview queue rows with status pending_mac when matching files exist in inbox/captures/inbox/.
Never uploads or submits (canvas-focus pivot) — CONFIRM=1 is ignored; upload in Canvas yourself.`);
}

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

if (process.env.CONFIRM === "1") {
  console.warn(
    "CONFIRM=1 is ignored: live photo submit is hard-blocked (canvas-focus pivot)."
  );
}

/**
 * @param {Array<{ id: number|string, name: string }>} assignments
 * @param {string} pattern
 */
function matchAssignment(assignments, pattern) {
  const needle = String(pattern || "").toLowerCase();
  if (!needle || needle === "-") return null;
  const exact = assignments.find((a) => a.name.toLowerCase() === needle);
  if (exact) return String(exact.id);
  const partial = assignments.find(
    (a) =>
      a.name.toLowerCase().includes(needle) || needle.includes(a.name.toLowerCase())
  );
  return partial ? String(partial.id) : null;
}

async function loadAssignments(page, courseId) {
  const res = await apiAllPages(page, `/api/v1/courses/${courseId}/assignments`, {
    include: ["submission"],
  });
  if (!res.ok) throw new Error(`assignments fetch failed: ${JSON.stringify(res.error)}`);
  return res.items || [];
}

async function main() {
  let queueContent = readCaptureQueue();
  let rows = parseCaptureQueue(queueContent).filter((r) => r.status === "pending_mac");
  if (onlyId) rows = rows.filter((r) => r.id === onlyId);

  if (rows.length === 0) {
    console.log("No pending_mac captures in queue.");
    return;
  }

  const { context, page } = await launchCanvasContext();
  try {
    await requireLoggedIn(page);

    for (const row of rows) {
      const filePath = resolveCaptureFile(row.local_path);
      if (!filePath) {
        console.warn(
          `[skip] ${row.id}: no local file (AirDrop to inbox/captures/inbox/${path.basename(row.local_path)})`
        );
        continue;
      }

      const mdPath = courseMdPath(row.course_guess);
      if (!mdPath) {
        console.warn(`[skip] ${row.id}: unknown course ${row.course_guess}`);
        continue;
      }

      const courseMd = fs.readFileSync(mdPath, "utf8");
      const courseId = parseCourseIdFromMd(courseMd);
      if (!courseId) {
        console.warn(`[skip] ${row.id}: no Canvas course id in ${mdPath}`);
        continue;
      }

      const assignments = await loadAssignments(page, courseId);
      const assignmentId = matchAssignment(assignments, row.assignment_match);
      if (!assignmentId) {
        console.warn(
          `[skip] ${row.id}: assignment not found for "${row.assignment_match}" — sync course catalog`
        );
        continue;
      }

      const preview = previewCaptureSubmit({
        courseId,
        assignmentId,
        filePath,
      });
      console.log(
        `\n${row.id}: ${row.course_guess} → assignment ${assignmentId}\n` +
          `  file: ${filePath}\n` +
          `  match: ${row.assignment_match}\n` +
          `  [preview] ${preview.message}`
      );
    }
  } finally {
    await context.close();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
