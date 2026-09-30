/**
 * Voice-intake config, paths, and Denver-time helpers.
 *
 * Time helpers are local on purpose: canvas-session.mjs pulls in Playwright,
 * which the voice server has no reason to load.
 */
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
export const TZ = "America/Denver";

/**
 * Example from the @google/genai Live docs. Live model ids change often — list
 * what your key can use with `npm run voice-models` and set GEMINI_LIVE_MODEL.
 */
export const DEFAULT_LIVE_MODEL = "gemini-live-2.5-flash-preview";

/** Mic audio in (PCM16 mono) and model audio out (PCM16 mono) sample rates. */
export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

/**
 * @param {string} [inboxDir]
 * @param {string} [repoRoot]
 */
export function voicePaths(inboxDir = path.join(REPO_ROOT, "inbox"), repoRoot = REPO_ROOT) {
  return {
    repoRoot,
    inboxDir,
    coursesDir: path.join(inboxDir, "courses"),
    goalsPath: path.join(inboxDir, "goals.md"),
    weekPath: path.join(inboxDir, "week.md"),
    jacobPath: path.join(repoRoot, "JACOB.md"),
    sessionsDir: path.join(inboxDir, "voice", "sessions"),
  };
}

/** Load repo-root `.env` into process.env (existing variables win). Missing file is fine. */
export function loadRepoEnv(repoRoot = REPO_ROOT) {
  try {
    process.loadEnvFile(path.join(repoRoot, ".env"));
  } catch {
    /* no .env — rely on the shell environment */
  }
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function readVoiceConfig(env = process.env) {
  return {
    apiKey: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "",
    model: env.GEMINI_LIVE_MODEL || DEFAULT_LIVE_MODEL,
    voiceName: env.VOICE_NAME || "",
    host: "127.0.0.1",
    port: Number(env.VOICE_PORT || 8787),
    // Reflective talk has long pauses; how much silence ends a turn (ms).
    silenceMs: Number(env.VOICE_SILENCE_MS || 1500),
  };
}

/** @param {Date} [d] @returns {string} YYYY-MM-DD in America/Denver */
export function denverDay(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** @param {Date} [d] @returns {string} YYYY-MM-DDTHH:MM MT (same shape as captures/queue.md) */
export function formatDenver(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")} MT`;
}

/** @param {Date} [d] @returns {string} YYYYMMDD-HHMMSS-hex4 in America/Denver (same shape as capture ids) */
export function makeSessionId(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  const hex = crypto.randomBytes(2).toString("hex");
  return `${get("year")}${get("month")}${get("day")}-${hour}${get("minute")}${get("second")}-${hex}`;
}
