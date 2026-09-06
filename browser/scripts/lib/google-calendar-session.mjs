/**
 * Google Calendar session via Chrome CDP (dedicated profile, separate from Canvas .auth).
 * Google blocks login from Playwright-launched browsers — use real Chrome + manual login.
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const GOOGLE_AUTH_DIR =
  process.env.GOOGLE_AUTH_DIR || path.join(__dirname, "..", "..", ".auth-google");
export const CDP_PORT = Number(process.env.GOOGLE_CDP_PORT || 9222);
export const CDP_URL = `http://127.0.0.1:${CDP_PORT}`;
export const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r";

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "chromium",
];

export function resolveChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  for (const p of CHROME_PATHS) {
    if (p.includes("/") && fs.existsSync(p)) return p;
  }
  for (const cmd of CHROME_PATHS.filter((p) => !p.includes("/"))) {
    try {
      execFileSync("which", [cmd], { stdio: "pipe" });
      return cmd;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    "Google Chrome not found. Set CHROME_PATH or install Chrome."
  );
}

export function clearChromeSingletonLocks(dir = GOOGLE_AUTH_DIR) {
  for (const name of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
    try {
      fs.unlinkSync(path.join(dir, name));
    } catch {
      /* absent is fine */
    }
  }
}

export async function isCdpReady() {
  try {
    const res = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function launchChromeWithCdp({ headless = false } = {}) {
  fs.mkdirSync(GOOGLE_AUTH_DIR, { recursive: true });
  clearChromeSingletonLocks();

  const chrome = resolveChromePath();
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${GOOGLE_AUTH_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    CALENDAR_URL,
  ];
  if (headless) args.push("--headless=new");

  const child = spawn(chrome, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return child;
}

export async function waitForCdp(maxMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isCdpReady()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function connectGoogleCalendar() {
  if (!(await isCdpReady())) {
    throw new Error(
      `CDP not ready at ${CDP_URL}. Run: cd browser && npm run open-google-calendar`
    );
  }
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error("No browser context on CDP connection.");
  }
  const page = context.pages()[0] || (await context.newPage());
  return { browser, context, page };
}

export async function verifyGoogleCalendarSession(page) {
  await page.goto(CALENDAR_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);
  const url = page.url();
  if (/accounts\.google\.com|signin/i.test(url)) {
    throw new Error(
      "Not logged into Google. Complete login in the Chrome window, then retry."
    );
  }
  return { ok: true, url };
}

export async function screenshotCalendar(page, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: false });
  return outPath;
}
