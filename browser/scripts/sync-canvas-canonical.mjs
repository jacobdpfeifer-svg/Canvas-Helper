/**
 * Unified Canvas reliability sync: one Playwright session → staged generation
 * → projections → adapters. Does not run the legacy two-pass fetch.
 *
 *   node scripts/sync-canvas-canonical.mjs
 *   CANVAS_ADAPTERS_ONLY=1  # rebuild adapters from current generation, no fetch
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { api, apiAllPages, launchCanvasContext, requireLoggedIn, writeCourseCatalogFiles, schoolLocalDay } from "./lib/canvas-session.mjs";
import { resolveUserRoot, resolveProductUserId } from "./lib/user-root.mjs";
import { fetchCanonicalGeneration } from "./lib/canvas-snapshot.mjs";
import { commitRawGeneration, newSyncId, pathsFor, readCurrentRaw, writeSyncRun, writeJsonAtomic } from "./lib/canvas-store.mjs";
import { buildProjections, promoteProjections } from "./lib/canvas-project.mjs";
import { writeAdaptersFromProjection } from "./lib/canvas-adapters.mjs";

const userRoot = resolveUserRoot({ create: true, announce: true });
const adaptersOnly = process.env.CANVAS_ADAPTERS_ONLY === "1" || process.env.CANVAS_ADAPTERS_ONLY === "true";
const daysAhead = Number(process.env.CATALOG_DAYS || process.env.DAYS || 150);
const outDir = path.join(userRoot, "inbox", "study-sources");
fs.mkdirSync(outDir, { recursive: true });
const progressPath = path.join(outDir, "progress.json");

function writeProgress(progress) {
  writeJsonAtomic(progressPath, progress);
  console.log(JSON.stringify({ type: "study-sync-progress", ...progress }));
}

function adaptersFromCurrent() {
  const cur = readCurrentRaw(userRoot);
  if (!cur) return { ok: false, error: "no current generation" };
  const projections = buildProjections(cur.generation);
  writeProjectionsSafe(cur.generation, projections);
  const ad = writeAdaptersFromProjection({
    userRoot,
    generation: cur.generation,
    projections,
    daysAhead: Number(process.env.DAYS || 14),
  });
  return { ok: ad.ok, error: ad.errors[0], sync_id: cur.pointer.sync_id };
}

function writeProjectionsSafe(generation, projections) {
  try {
    return promoteProjections(userRoot, generation);
  } catch (e) {
    console.error(`projection build failed; keeping previous projections pointer: ${e.message || e}`);
    const p = pathsFor(userRoot);
    const dir = path.join(p.projections, projections.sync_id);
    try {
      fs.mkdirSync(dir, { recursive: true });
      writeJsonAtomic(path.join(dir, "FAILED.json"), { error: String(e.message || e), sync_id: projections.sync_id });
    } catch {
      /* ignore */
    }
    return null;
  }
}

if (adaptersOnly) {
  const r = adaptersFromCurrent();
  if (!r.ok) {
    console.error(r.error || "adapters-only failed");
    process.exit(1);
  }
  console.log(`Adapters rebuilt from ${r.sync_id}`);
  process.exit(0);
}

writeProgress({ phase: "running", courses: [] });
const { context, page } = await launchCanvasContext({ headless: true });
try {
  await requireLoggedIn(page);
} catch (e) {
  writeProgress({ phase: "failed", error: String(e?.message || e), courses: [] });
  console.error(String(e.message || e));
  await context.close();
  process.exit(1);
}

const sync_id = newSyncId();
let generation;
try {
  generation = await fetchCanonicalGeneration(page, {
    apiAllPages,
    api,
    sync_id,
    profile_id: resolveProductUserId(),
    daysAhead,
  });
} catch (e) {
  writeProgress({ phase: "failed", error: String(e?.message || e), courses: [] });
  console.error(String(e.message || e));
  await context.close();
  process.exit(1);
}

const committed = commitRawGeneration(userRoot, generation, { sync_id });
if (!committed.ok) {
  writeProgress({ phase: "failed", error: "validation failed", courses: [] });
  console.error((committed.errors || []).join("; "));
  await context.close();
  process.exit(1);
}

let projections;
try {
  projections = buildProjections(committed.manifest ? generation : generation);
  const promoted = writeProjectionsSafe(generation, projections);
  if (promoted) projections = promoted.projections;
} catch (e) {
  console.error(`projection failed: ${e.message || e}`);
}

const adapter = writeAdaptersFromProjection({
  userRoot,
  generation,
  projections: projections || buildProjections(generation),
  daysAhead: Number(process.env.DAYS || 14),
});
if (!adapter.ok) {
  console.warn(`adapters failed (canonical snapshot kept): ${adapter.errors.join("; ")}`);
}

try {
  const perCourse = generation.courses.map((pack) => ({
    id: pack.course.id,
    name: pack.course.name,
    code: pack.course.course_code,
    rows: [],
    assignments_ok: true,
    assignments_count: (pack.assignments || []).length,
    assignments_truncated: false,
    discussions_ok: true,
    discussions_count: (pack.discussions || []).length,
    canvasUrl: pack.course.html_url,
    primaryInstructors: [],
    tas: [],
    syllabusPlain: String(pack.course.syllabus_body || "").replace(/<[^>]+>/g, " "),
    syllabusHash: "",
    policyPages: [],
    syllabus_ok: Boolean(pack.course.syllabus_body),
  }));
  writeCourseCatalogFiles(perCourse, { today: schoolLocalDay() });
} catch (e) {
  console.warn(`course catalogs adapter failed: ${e.message || e}`);
}

writeSyncRun(userRoot, {
  sync_id,
  started_at: generation.manifest.started_at,
  finished_at: generation.manifest.finished_at,
  complete: generation.manifest.complete,
  health: projections?.health || null,
});

writeProgress({
  phase: generation.manifest.complete ? "done" : "done",
  error: null,
  courses: generation.courses.map((p) => ({
    id: String(p.course.id),
    label: p.course.course_code || p.course.name,
    ok: !(generation.manifest.named_courses_failed || []).includes(String(p.course.id)),
  })),
});

{
  const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const proc = spawnSync("uv", ["run", "python", "-m", "canvas_mcp.core.learn_loop", "reconcile", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
  if (proc.status !== 0) {
    console.warn("learn_loop reconcile exited non-zero — checkpoint drift may be stale");
  }
}

await context.close();
console.log(JSON.stringify({ sync_id, complete: generation.manifest.complete, courses: generation.courses.length }, null, 2));
