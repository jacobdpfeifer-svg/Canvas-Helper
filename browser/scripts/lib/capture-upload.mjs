/**
 * Canvas file upload + submission via SSO session (cookies).
 * Mirrors MCP submit_assignment online_upload (preview-only here — caller confirms).
 */
import fs from "node:fs";
import path from "node:path";
import { api, BASE } from "./canvas-session.mjs";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/heic",
  ".webp": "image/webp",
};

/**
 * @param {string} filePath
 */
export function mimeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

/**
 * @param {import('playwright').Page} page
 * @param {{ courseId: string, filePath: string, fileName?: string }} opts
 */
export async function uploadCourseFile(page, { courseId, filePath, fileName }) {
  const name = fileName || path.basename(filePath);
  const contentType = mimeForPath(filePath);
  const stat = fs.statSync(filePath);
  const size = stat.size;
  const base64 = fs.readFileSync(filePath).toString("base64");

  const step1 = await page.evaluate(
    async ({ courseId: cid, name: fname, contentType: ct, size: fsize }) => {
      const qs = new URLSearchParams({
        name: fname,
        size: String(fsize),
        content_type: ct,
        parent_folder_path: "unfiled",
      });
      const res = await fetch(`/api/v1/courses/${cid}/files?${qs.toString()}`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 300) };
      }
      return { ok: res.ok, status: res.status, json };
    },
    { courseId, name, contentType, size }
  );

  if (!step1.ok) {
    throw new Error(
      `Canvas upload init failed (${step1.status}): ${JSON.stringify(step1.json)}`
    );
  }

  const { upload_url: uploadUrl, upload_params: uploadParams } = step1.json;
  if (!uploadUrl || !uploadParams) {
    throw new Error(`Missing upload_url in Canvas response: ${JSON.stringify(step1.json)}`);
  }

  const step2 = await page.evaluate(
    async ({ uploadUrl: url, uploadParams: params, base64: b64, name: fname, contentType: ct }) => {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: ct });
      const form = new FormData();
      for (const [k, v] of Object.entries(params)) form.append(k, v);
      form.append("file", blob, fname);
      const res = await fetch(url, { method: "POST", body: form, redirect: "manual" });
      const loc = res.headers.get("Location");
      let json = null;
      const text = await res.text();
      try {
        json = JSON.parse(text);
      } catch {
        json = text ? { raw: text.slice(0, 300) } : null;
      }
      return { status: res.status, location: loc, json };
    },
    { uploadUrl, uploadParams, base64, name, contentType }
  );

  let fileId = step2.json?.id;
  if (!fileId && step2.location) {
    const loc = step2.location.startsWith("http") ? step2.location : `${BASE}${step2.location}`;
    await page.goto(loc, { waitUntil: "domcontentloaded" });
    const confirm = await api(page, loc);
    if (confirm.ok && confirm.json?.id) fileId = confirm.json.id;
  }
  if (!fileId && step1.json?.id) fileId = step1.json.id;

  if (!fileId) {
    throw new Error(`Upload did not return file id: ${JSON.stringify(step2)}`);
  }
  return String(fileId);
}

/**
 * @param {import('playwright').Page} page
 * @param {{ courseId: string, assignmentId: string, fileId: string, dryRun?: boolean }} opts
 */
export async function submitOnlineUpload(page, { courseId, assignmentId, fileId, dryRun = false }) {
  if (dryRun) {
    return { dryRun: true, courseId, assignmentId, fileId };
  }
  const res = await page.evaluate(
    async ({ courseId: cid, assignmentId: aid, fileId: fid }) => {
      const body = new URLSearchParams();
      body.set("submission[submission_type]", "online_upload");
      body.append("submission[file_ids][]", fid);
      const url = `/api/v1/courses/${cid}/assignments/${aid}/submissions`;
      const r = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      const text = await r.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 500) };
      }
      return { ok: r.ok, status: r.status, json };
    },
    { courseId, assignmentId, fileId }
  );
  if (!res.ok) {
    throw new Error(`Submit failed (${res.status}): ${JSON.stringify(res.json)}`);
  }
  return res.json;
}

/**
 * @param {import('playwright').Page} page
 * @param {{ courseId: string, assignmentId: string, filePath: string, dryRun?: boolean }} opts
 */
export async function uploadAndSubmitAssignment(page, opts) {
  const fileId = await uploadCourseFile(page, {
    courseId: opts.courseId,
    filePath: opts.filePath,
  });
  return submitOnlineUpload(page, {
    courseId: opts.courseId,
    assignmentId: opts.assignmentId,
    fileId,
    dryRun: opts.dryRun,
  });
}
