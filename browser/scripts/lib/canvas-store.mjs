/**
 * Generation commit protocol: staging → generations → pointer files (not symlinks).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { SCHEMA_VERSION, hashFields, validateGeneration, hashProfileId } from "./canvas-model.mjs";
import { resolveUserRoot } from "./user-root.mjs";

export const MAX_GENERATIONS = 3; // current + two prior

export function canvasRoot(userRoot) {
  return path.join(userRoot, "inbox", "canvas");
}

export function pathsFor(userRoot) {
  const root = canvasRoot(userRoot);
  return {
    root,
    staging: path.join(root, "raw", "staging"),
    generations: path.join(root, "raw", "generations"),
    rawPointer: path.join(root, "raw", "current.json"),
    projections: path.join(root, "projections"),
    projPointer: path.join(root, "projections", "current.json"),
    syncRuns: path.join(root, "sync-runs"),
  };
}

export function newSyncId(now = new Date()) {
  return `sync-${now.toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
}

export function writeJsonAtomic(file, data, { mode = 0o600 } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: "utf8", mode });
  try {
    const fd = fs.openSync(tmp, "r+");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
  } catch {
    /* fsync optional */
  }
  fs.renameSync(tmp, file);
  try {
    fs.chmodSync(file, mode);
  } catch {
    /* windows */
  }
}

export function writePointer(file, payload) {
  writeJsonAtomic(file, payload);
}

export function readPointer(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function writeEndpointFile(dir, name, payload) {
  writeJsonAtomic(path.join(dir, name), payload);
}

export function materializeGenerationDir(dest, generation) {
  fs.mkdirSync(dest, { recursive: true });
  const hashes = {};
  function put(rel, data) {
    const file = path.join(dest, rel);
    writeJsonAtomic(file, data);
    hashes[rel] = hashFields(data);
  }
  for (const c of generation.courses || []) {
    const id = String(c.course.id);
    const base = path.join("courses", id);
    fs.mkdirSync(path.join(dest, base), { recursive: true });
    put(path.join(base, "course.json"), c.course);
    put(path.join(base, "assignments.json"), c.assignments || []);
    put(path.join(base, "assignment-groups.json"), c["assignment-groups"] || []);
    put(path.join(base, "submissions.json"), c.submissions || []);
    put(path.join(base, "modules.json"), c.modules || []);
    put(path.join(base, "discussions.json"), c.discussions || []);
    put(path.join(base, "quizzes.json"), c.quizzes || []);
    if (c.pages) put(path.join(base, "pages.json"), c.pages);
  }
  fs.mkdirSync(path.join(dest, "global"), { recursive: true });
  put(path.join("global", "planner.json"), generation.global?.planner || []);
  put(path.join("global", "todo.json"), generation.global?.todo || []);
  put(path.join("global", "calendar-events.json"), generation.global?.["calendar-events"] || []);
  const manifest = {
    ...generation.manifest,
    schema_version: generation.manifest?.schema_version ?? SCHEMA_VERSION,
    file_hashes: hashes,
  };
  put("manifest.json", manifest);
  return { dest, manifest, hashes };
}

export function loadGeneration(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const coursesDir = path.join(dir, "courses");
  const courses = [];
  if (fs.existsSync(coursesDir)) {
    const ids = fs.readdirSync(coursesDir).sort();
    for (const id of ids) {
      const base = path.join(coursesDir, id);
      if (!fs.statSync(base).isDirectory()) continue;
      const read = (name, fallback = []) => {
        const p = path.join(base, name);
        if (!fs.existsSync(p)) return fallback;
        return JSON.parse(fs.readFileSync(p, "utf8"));
      };
      courses.push({
        course: read("course.json", {}),
        assignments: read("assignments.json"),
        "assignment-groups": read("assignment-groups.json"),
        submissions: read("submissions.json"),
        modules: read("modules.json"),
        discussions: read("discussions.json"),
        quizzes: read("quizzes.json"),
        pages: read("pages.json", []),
      });
    }
  }
  const g = (name) => {
    const p = path.join(dir, "global", name);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
  };
  return {
    manifest,
    courses,
    global: {
      planner: g("planner.json"),
      todo: g("todo.json"),
      "calendar-events": g("calendar-events.json"),
    },
    fetched_at: manifest.finished_at,
    timezone: manifest.timezone,
    tenant_id: manifest.tenant_id,
  };
}

/**
 * Write staging, validate, rename to generations, replace raw pointer.
 * Does not build projections.
 */
export function commitRawGeneration(userRoot, generation, { sync_id } = {}) {
  const p = pathsFor(userRoot);
  const id = sync_id || generation.manifest?.sync_id || newSyncId();
  const stagingDir = path.join(p.staging, id);
  if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
  const { manifest } = materializeGenerationDir(stagingDir, {
    ...generation,
    manifest: { ...generation.manifest, sync_id: id },
  });
  const loaded = loadGeneration(stagingDir);
  const check = validateGeneration(loaded);
  if (!check.ok && !manifest.usable_partial) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    return { ok: false, errors: check.errors, unkeyed_sources: check.unkeyed_sources, sync_id: id };
  }
  fs.mkdirSync(p.generations, { recursive: true });
  const dest = path.join(p.generations, id);
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.renameSync(stagingDir, dest);
  writePointer(p.rawPointer, {
    sync_id: id,
    path: dest,
    complete: Boolean(manifest.complete),
    usable_partial: Boolean(manifest.usable_partial),
    finished_at: manifest.finished_at,
  });
  pruneGenerations(p.generations, id);
  return { ok: true, sync_id: id, dir: dest, validation: check, manifest };
}

export function commitProjectionPointer(userRoot, { sync_id, dir, health }) {
  const p = pathsFor(userRoot);
  writePointer(p.projPointer, {
    sync_id,
    path: dir,
    health_state: health?.state || null,
    finished_at: health?.as_of || null,
  });
  pruneGenerations(p.projections, sync_id, { keepPointer: true });
}

export function readCurrentRaw(userRoot) {
  const p = pathsFor(userRoot);
  const ptr = readPointer(p.rawPointer);
  if (!ptr?.path || !fs.existsSync(ptr.path)) return null;
  return { pointer: ptr, generation: loadGeneration(ptr.path) };
}

export function readCurrentProjections(userRoot) {
  const p = pathsFor(userRoot);
  const ptr = readPointer(p.projPointer);
  if (!ptr?.path || !fs.existsSync(ptr.path)) return null;
  return { pointer: ptr, dir: ptr.path };
}

export function pruneGenerations(parent, currentId, { keepPointer = false } = {}) {
  if (!fs.existsSync(parent)) return;
  const names = fs
    .readdirSync(parent)
    .filter((n) => n !== "current.json" && n !== "current")
    .filter((n) => {
      try {
        return fs.statSync(path.join(parent, n)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
  const keep = new Set([currentId]);
  const others = names.filter((n) => n !== currentId).slice(-2);
  for (const n of others) keep.add(n);
  for (const n of names) {
    if (!keep.has(n)) {
      fs.rmSync(path.join(parent, n), { recursive: true, force: true });
    }
  }
}

export function writeSyncRun(userRoot, run) {
  const p = pathsFor(userRoot);
  fs.mkdirSync(p.syncRuns, { recursive: true });
  writeJsonAtomic(path.join(p.syncRuns, `${run.sync_id}.json`), run);
}

export function defaultUserRoot() {
  return resolveUserRoot({ create: true, announce: false });
}

export { hashProfileId };
