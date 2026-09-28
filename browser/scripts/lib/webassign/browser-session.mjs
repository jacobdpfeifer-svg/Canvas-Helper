/**
 * Persistent WebAssign browser via Chrome CDP (survives script exit).
 * Reuses browser/.auth cookies; avoids Canvas→WebAssign round-trip on every command.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { clearSingletonLocks } from "../canvas-session.mjs";
import { resolveChromePath } from "../google-calendar-session.mjs";
import {
  acceptCookies,
  ensureAssignmentPage,
  findWebAssignPage,
  tryInstitutionSso,
} from "./session.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Dedicated profile so WebAssign CDP does not fight Canvas sync on browser/.auth */
export const WEBASSIGN_AUTH_DIR =
  process.env.WEBASSIGN_AUTH_DIR ||
  path.join(__dirname, "..", "..", "..", ".auth-webassign");
export const WEBASSIGN_CDP_PORT = Number(process.env.WEBASSIGN_CDP_PORT || 9224);
export const WEBASSIGN_CDP_URL = `http://127.0.0.1:${WEBASSIGN_CDP_PORT}`;
export const SESSION_FILE =
  process.env.WEBASSIGN_SESSION_FILE ||
  path.join(__dirname, "..", "..", "..", ".webassign-session.json");

const WA_LOGIN = "https://www.webassign.net/colorado/login.html";
const WA_STUDENT = /webassign\.net\/web\/Student/i;
const STOP_FILE = path.join(__dirname, "..", "..", "..", ".webassign-stop");

function assertWebAssignNotStopped() {
  if (fs.existsSync(STOP_FILE)) {
    throw new Error(
      "WebAssign automation is stopped (browser/.webassign-stop). Delete that file to run again."
    );
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function readSessionState() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function writeSessionState(patch) {
  const prev = readSessionState();
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(next, null, 2));
  return next;
}

export async function isWebAssignCdpReady() {
  try {
    const browser = await chromium.connectOverCDP(WEBASSIGN_CDP_URL, { timeout: 5000 });
    await browser.close();
    return true;
  } catch {
    return false;
  }
}

export async function waitForWebAssignCdp(maxMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isWebAssignCdpReady()) return true;
    await sleep(750);
  }
  return false;
}

/**
 * Launch detached Chrome with CDP + browser/.auth (same cookies as open-canvas).
 */
export function launchWebAssignChrome(startUrl) {
  assertWebAssignNotStopped();
  fs.mkdirSync(WEBASSIGN_AUTH_DIR, { recursive: true });
  clearSingletonLocks(WEBASSIGN_AUTH_DIR);

  const chrome = resolveChromePath();
  const args = [
    `--remote-debugging-port=${WEBASSIGN_CDP_PORT}`,
    `--user-data-dir=${WEBASSIGN_AUTH_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    startUrl || WA_LOGIN,
  ];

  const child = spawn(chrome, args, { detached: true, stdio: "ignore" });
  child.unref();
  return child;
}

/**
 * Connect to an already-running WebAssign Chrome (does not close browser on disconnect).
 */
export async function connectWebAssignBrowser() {
  if (!(await isWebAssignCdpReady())) {
    throw new Error(
      `WebAssign CDP not ready at ${WEBASSIGN_CDP_URL}. Run: cd browser && npm run open-webassign`
    );
  }
  const browser = await chromium.connectOverCDP(WEBASSIGN_CDP_URL);
  const context = browser.contexts()[0];
  if (!context) throw new Error("No browser context on WebAssign CDP connection.");
  const page = context.pages()[0] || (await context.newPage());
  context.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  for (const p of context.pages()) {
    p.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  }
  return { browser, context, page, cdp: true };
}

async function waitForWebAssignStudent(context, wa, log, maxMs = 480_000) {
  log?.event("waiting_webassign", { url: wa.url() });
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await sleep(3000);
    for (const p of context.pages()) {
      if (WA_STUDENT.test(p.url())) {
        wa = p;
        break;
      }
    }
    if (WA_STUDENT.test(wa.url())) break;
    console.log("wait-wa", wa.url().slice(0, 120));
  }
  if (!WA_STUDENT.test(wa.url())) {
    throw new Error("WebAssign login not completed in time");
  }
  await acceptCookies(wa);
  log?.event("webassign_ready", { url: wa.url() });
  return wa;
}

/**
 * Prefer an existing WebAssign tab; otherwise open saved/direct URL (skip Canvas).
 */
export async function acquireWebAssignPage({
  assignmentUrl,
  waUrl,
  titleRe,
  log,
  launchIfNeeded = true,
}) {
  assertWebAssignNotStopped();
  let browser;
  let context;
  let page;
  let cdp = false;

  let connected = await isWebAssignCdpReady();
  if (!connected) {
    if (!launchIfNeeded) {
      throw new Error(
        `No WebAssign browser session. Run: cd browser && npm run open-webassign`
      );
    }
    const saved = readSessionState();
    const start = waUrl || saved.waUrl || assignmentUrl || WA_LOGIN;
    console.log("Launching WebAssign Chrome (CDP) — leave this window open between runs.");
    launchWebAssignChrome(start);
    if (!(await waitForWebAssignCdp())) {
      throw new Error(
        "WebAssign Chrome did not start CDP in time. Close other Chrome using browser/.auth, then: npm run open-webassign"
      );
    }
    connected = true;
  }

  ({ browser, context, page, cdp } = await connectWebAssignBrowser());

  // Tabs may appear shortly after CDP attach
  for (let i = 0; i < 20 && !findWebAssignPage(context); i++) {
    await sleep(500);
  }

  let wa = findWebAssignPage(context);
  if (wa && WA_STUDENT.test(wa.url())) {
    log?.event("reuse_webassign_tab", { url: wa.url() });
    console.log("Reusing open WebAssign tab:", wa.url().slice(0, 100));
  } else {
    const target = waUrl || readSessionState().waUrl || assignmentUrl;
    log?.event("goto_webassign_direct", { url: target });
    console.log("Opening WebAssign directly (no Canvas round-trip):", target?.slice(0, 100));
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 90_000 });
    wa = page;
    await sleep(2000);
    await acceptCookies(wa);
    await tryInstitutionSso(wa);

    if (!WA_STUDENT.test(wa.url())) {
      console.log(`
============================================================
If prompted: complete WebAssign/Cengage sign-in in the Chrome
window. Do NOT close Chrome — later runs reuse this session.
============================================================
`);
      wa = await waitForWebAssignStudent(context, wa, log);
    }
  }

  const meta = await ensureAssignmentPage(wa, titleRe, log);
  writeSessionState({
    assignmentUrl,
    waUrl: meta.url || wa.url(),
    title: meta.title,
  });

  return { browser, context, page, wa, cdp, meta };
}

/** Disconnect CDP without closing Chrome (default end-of-run). */
export async function releaseWebAssignBrowser(browser, { close = false } = {}) {
  if (!browser) return;
  // connectOverCDP: close() disconnects only; use kill for --close
  if (close && browser.process?.()) {
    browser.process()?.kill?.();
  }
  await browser.close().catch(() => {});
}
