/**
 * Canvas file upload helpers for photo-intake preview.
 *
 * Canvas-focus pivot (docs/handoff/canvas-focus-pivot-2026-09-11.md):
 * this product never submits assignments on the student's behalf. Live
 * ``CONFIRM=1`` submit is hard-blocked — preview only; student uploads in
 * Canvas themselves.
 */
import fs from "node:fs";
import path from "node:path";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/heic",
  ".webp": "image/webp",
};

const SUBMIT_BLOCKED =
  "Blocked (canvas-focus pivot): this tool never submits to Canvas. " +
  "Preview the file + assignment match, then upload it yourself in Canvas.";

/**
 * @param {string} filePath
 */
export function mimeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

/**
 * Preview metadata for a local capture file (no Canvas write).
 * @param {{ courseId: string, assignmentId: string, filePath: string }} opts
 */
export function previewCaptureSubmit(opts) {
  const { courseId, assignmentId, filePath } = opts;
  const name = path.basename(filePath);
  let size = null;
  try {
    size = fs.statSync(filePath).size;
  } catch {
    size = null;
  }
  return {
    blocked: true,
    dryRun: true,
    courseId,
    assignmentId,
    filePath,
    fileName: name,
    mimeType: mimeForPath(filePath),
    sizeBytes: size,
    message: SUBMIT_BLOCKED,
  };
}

/**
 * @deprecated Live course-file upload removed (canvas-focus pivot).
 * Kept as a named export so old call sites fail closed instead of POSTing.
 * @param {import('playwright').Page} _page
 * @param {{ courseId: string, filePath: string, fileName?: string }} opts
 */
export async function uploadCourseFile(_page, opts) {
  return previewCaptureSubmit({
    courseId: opts.courseId,
    assignmentId: "(not submitted)",
    filePath: opts.filePath,
  });
}

/**
 * Preview-only. Never POSTs a submission (canvas-focus pivot).
 * @param {import('playwright').Page} _page
 * @param {{ courseId: string, assignmentId: string, fileId: string, dryRun?: boolean, filePath?: string }} opts
 */
export async function submitOnlineUpload(_page, opts) {
  if (opts.filePath) {
    return previewCaptureSubmit({
      courseId: opts.courseId,
      assignmentId: opts.assignmentId,
      filePath: opts.filePath,
    });
  }
  return {
    blocked: true,
    dryRun: true,
    courseId: opts.courseId,
    assignmentId: opts.assignmentId,
    fileId: opts.fileId,
    message: SUBMIT_BLOCKED,
  };
}

/**
 * Preview-only. Never uploads or submits (canvas-focus pivot).
 * @param {import('playwright').Page} page
 * @param {{ courseId: string, assignmentId: string, filePath: string, dryRun?: boolean }} opts
 */
export async function uploadAndSubmitAssignment(page, opts) {
  return submitOnlineUpload(page, {
    courseId: opts.courseId,
    assignmentId: opts.assignmentId,
    fileId: "(preview — no upload)",
    filePath: opts.filePath,
    dryRun: true,
  });
}
