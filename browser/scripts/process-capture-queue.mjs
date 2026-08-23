#!/usr/bin/env node
/**
 * Process pending_mac rows in inbox/captures/queue.md.
 * Requires SSO session (npm run open-canvas) and local photo in inbox/captures/inbox/.
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
  touchQueueUpdated,
  updateCaptureQueueRow,
  writeCaptureQueue,
  PROCESSED_DIR,
} from "./lib/capture-queue.mjs";
import { uploadAndSubmitAssignment } from "./lib/capture-upload.mjs";
import {
  apiAllPages,
  launchCanvasContext,
  requireLoggedIn,
} from "./lib/canvas-session.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const idFlag = args.indexOf("--id");
const onlyId = idFlag >= 0 ? args[idFlag + 1] : null;

function usage() {
  console.log(`Usage: npm run process-capture-queue [-- --dry-run] [-- --id CAPTURE_ID]

Processes queue rows with status pending_mac when matching files exist in inbox/captures/inbox/.
Jacob must confirm uploads — pass CONFIRM=1 to submit (otherwise dry-run preview).`);
}

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

const confirm = process.env.CONFIRM === "1";

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

      console.log(
        `\n${row.id}: ${row.course_guess} → assignment ${assignmentId}\n  file: ${filePath}\n  match: ${row.assignment_match}`
      );

      if (dryRun || !confirm) {
        console.log("  [preview] would upload + submit (set CONFIRM=1 to execute)");
        continue;
      }

      try {
        await uploadAndSubmitAssignment(page, {
          courseId,
          assignmentId,
          filePath,
        });
        fs.mkdirSync(PROCESSED_DIR, { recursive: true });
        const dest = path.join(PROCESSED_DIR, path.basename(filePath));
        fs.renameSync(filePath, dest);
        const updated = updateCaptureQueueRow(queueContent, row.id, {
          status: "uploaded",
          notes: `${row.notes}; uploaded ${new Date().toISOString()}`,
        });
        if (updated.found) {
          queueContent = touchQueueUpdated(updated.content);
          writeCaptureQueue(queueContent);
        }
        console.log(`  [ok] uploaded and submitted; archived to processed/`);
      } catch (e) {
        const fail = updateCaptureQueueRow(queueContent, row.id, {
          status: "failed",
          notes: `${row.notes}; error: ${String(e.message || e)}`,
        });
        if (fail.found) {
          queueContent = touchQueueUpdated(fail.content);
          writeCaptureQueue(queueContent);
        }
        console.error(`  [fail] ${e.message || e}`);
      }
    }
  } finally {
    await context.close();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
