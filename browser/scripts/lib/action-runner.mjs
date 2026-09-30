/**
 * Ordered action runner for Playwright connectors (plugins/*).
 *
 * Runner discipline borrowed from cell-use's PhoneAgent loop, applied to the
 * browser — no device harness, no model in the loop:
 *
 *   act → fresh observation (url, title, screenshot) → check → next step
 *
 * - Every step re-observes the page after it acts; checks never reuse a
 *   pre-action observation.
 * - A failed check or a thrown act halts the run. Later steps never run.
 * - The plan must end in exactly one `finish` step. Its check is the run's
 *   verdict — a plan without one is refused before any step acts.
 * - Per-step diagnostics (observation, act result, check detail, timings)
 *   land in `{user_root}/diagnostics/{label}-{stamp}/run.json`, outside
 *   `inbox/` so agent memory reads never pick them up.
 * - Screenshots are captured every step but, by default, written to disk only
 *   when the run fails: they show the student's name and attendee lists, and a
 *   successful run needs no proof beyond its verdict.
 *
 * The runner does not decide whether an action is allowed. Confirmation
 * gates (--confirm, ConfirmationGuard) stay with the caller and the act.
 */
import fs from "node:fs";
import path from "node:path";
import { resolveUserRoot } from "./user-root.mjs";

export const DEFAULT_KEEP_RUNS = 10;

/** @returns {string} `{user_root}/diagnostics` */
export function defaultDiagnosticsDir() {
  return path.join(resolveUserRoot(), "diagnostics");
}

/**
 * @typedef {object} ActionStep
 * @property {string} name
 * @property {(page: any, ctx: RunContext) => Promise<any>} [act]
 *   Omit for an observe-and-check-only step.
 * @property {(page: any, ctx: RunContext) => Promise<CheckResult>|CheckResult} [check]
 *   Runs against the fresh post-act observation. Required on the finish step.
 * @property {boolean} [finish]  Marks the verdict step (must be last, exactly one).
 *
 * @typedef {{ ok: boolean, detail?: any }} CheckResult
 * @typedef {{ results: Record<string, any>, observation: Observation|null }} RunContext
 * @typedef {{ at: string, url: string, title: string, screenshot: string|null }} Observation
 * @typedef {"on-failure"|"always"|"never"} ScreenshotMode
 */

/** @param {ActionStep[]} steps */
export function validatePlan(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error("action plan has no steps");
  }
  const names = new Set();
  for (const s of steps) {
    if (!s || typeof s.name !== "string" || !s.name.trim()) {
      throw new Error("every step needs a name");
    }
    if (names.has(s.name)) throw new Error(`duplicate step name: ${s.name}`);
    names.add(s.name);
  }
  const finishes = steps.filter((s) => s.finish);
  if (finishes.length !== 1) {
    throw new Error(`action plan needs exactly one finish step (found ${finishes.length})`);
  }
  if (!steps[steps.length - 1].finish) {
    throw new Error("finish step must be the last step");
  }
  if (typeof finishes[0].check !== "function") {
    throw new Error("finish step needs a check — it is the run's verdict");
  }
}

function slug(s) {
  return String(s || "run")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "run";
}

function stampOf(d) {
  return d.toISOString().replace(/[:.]/g, "-");
}

/** @param {boolean|ScreenshotMode|undefined} v @returns {ScreenshotMode} */
function screenshotMode(v) {
  if (v === true) return "always";
  if (v === false) return "never";
  return v === "always" || v === "never" ? v : "on-failure";
}

/** Keep only the newest `keep` run dirs for this label. */
export function pruneRuns(diagnosticsDir, label, keep = DEFAULT_KEEP_RUNS) {
  let entries;
  try {
    entries = fs.readdirSync(diagnosticsDir, { withFileTypes: true });
  } catch {
    return;
  }
  // Stamps start with a digit, so "rsvp-" never swallows "rsvp-extra-…" runs.
  const re = new RegExp(`^${slug(label)}-\\d{4}-`);
  const dirs = entries
    .filter((e) => e.isDirectory() && re.test(e.name))
    .map((e) => e.name)
    .sort();
  for (const name of dirs.slice(0, Math.max(0, dirs.length - keep))) {
    fs.rmSync(path.join(diagnosticsDir, name), { recursive: true, force: true });
  }
}

/** JSON-safe copy of an act result (drops functions / page handles / cycles). */
function safe(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return String(value);
  }
}

async function observe(page, { index, name, capture, now }) {
  const at = now().toISOString();
  let url = "";
  let title = "";
  try {
    url = String(page.url());
  } catch {}
  try {
    title = String(await page.title());
  } catch {}
  let shot = null;
  if (capture && typeof page.screenshot === "function") {
    try {
      const buf = await page.screenshot({ fullPage: true });
      if (buf) {
        shot = {
          file: `step-${String(index + 1).padStart(2, "0")}-${slug(name)}.png`,
          buf,
        };
      }
    } catch {
      shot = null;
    }
  }
  return { observation: { at, url, title, screenshot: shot ? shot.file : null }, shot };
}

/**
 * Run an ordered plan against a Playwright page.
 *
 * @param {any} page
 * @param {{
 *   label: string,
 *   steps: ActionStep[],
 *   meta?: Record<string, any>,        // copied into run.json (e.g. eventId)
 *   diagnosticsDir?: string|null,      // null disables diagnostics on disk
 *   screenshots?: boolean|ScreenshotMode,
 *   keepRuns?: number,
 *   now?: () => Date,
 * }} opts
 */
export async function runActionPlan(page, opts) {
  const { label, steps, meta = {}, keepRuns = DEFAULT_KEEP_RUNS, now = () => new Date() } = opts;
  validatePlan(steps);

  const diagnosticsDir =
    opts.diagnosticsDir === undefined ? defaultDiagnosticsDir() : opts.diagnosticsDir;
  const mode = diagnosticsDir ? screenshotMode(opts.screenshots) : "never";
  const startedAt = now();

  /** @type {RunContext} */
  const ctx = { results: {}, observation: null };
  const log = [];
  const shots = [];
  let haltedAt = null;
  let verdict = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const t0 = now();
    const entry = { step: step.name, finish: !!step.finish, act: null, check: null };

    if (step.act) {
      try {
        const out = await step.act(page, ctx);
        ctx.results[step.name] = out;
        entry.act = { ok: true, result: safe(out) };
      } catch (e) {
        entry.act = { ok: false, error: String(e?.message || e) };
      }
    }

    const { observation, shot } = await observe(page, {
      index: i,
      name: step.name,
      capture: mode !== "never",
      now,
    });
    ctx.observation = observation;
    entry.observation = observation;
    if (shot) shots.push(shot);

    if (entry.act && !entry.act.ok) {
      entry.durationMs = now() - t0;
      log.push(entry);
      haltedAt = step.name;
      break;
    }

    if (step.check) {
      let res;
      try {
        res = await step.check(page, ctx);
      } catch (e) {
        res = { ok: false, detail: { error: String(e?.message || e) } };
      }
      entry.check = { ok: !!res?.ok, detail: safe(res?.detail) };
    }
    entry.durationMs = now() - t0;
    log.push(entry);

    if (entry.check && !entry.check.ok) {
      haltedAt = step.name;
      if (step.finish) verdict = entry.check;
      break;
    }
    if (step.finish) verdict = entry.check;
  }

  // finished = the finish step's check ran; ok = it passed.
  const finished = verdict !== null;
  const ok = finished && verdict.ok;
  const keepShots = mode === "always" || (mode === "on-failure" && !ok);
  if (!keepShots) {
    for (const entry of log) entry.observation.screenshot = null;
  }

  let runDir = null;
  if (diagnosticsDir) {
    runDir = path.join(diagnosticsDir, `${slug(label)}-${stampOf(startedAt)}`);
    fs.mkdirSync(runDir, { recursive: true });
    if (keepShots) {
      for (const s of shots) fs.writeFileSync(path.join(runDir, s.file), s.buf);
    }
  }

  const lastShot = keepShots ? [...log].reverse().find((e) => e.observation.screenshot) : null;
  const run = {
    label,
    meta: safe(meta),
    ok,
    finished,
    haltedAt,
    verdict,
    startedAt: startedAt.toISOString(),
    endedAt: now().toISOString(),
    steps: log,
    diagnostics: runDir,
    lastScreenshot:
      runDir && lastShot ? path.join(runDir, lastShot.observation.screenshot) : null,
  };

  if (runDir) {
    fs.writeFileSync(path.join(runDir, "run.json"), JSON.stringify(run, null, 2) + "\n", "utf8");
    pruneRuns(diagnosticsDir, label, keepRuns);
  }
  return run;
}
