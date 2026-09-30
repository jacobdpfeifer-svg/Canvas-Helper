/**
 * CampusGroups session helpers — Shibboleth SSO via shared browser/.auth profile.
 * Playwright automation only; IDE browser has no SSO.
 */
import fs from "node:fs";
import path from "node:path";
import {
  AUTH_DIR,
  INBOX_DIR,
  schoolLocalDay,
  launchCanvasContext,
  resolveUserRoot,
} from "../../browser/scripts/lib/canvas-session.mjs";
import { runActionPlan } from "../../browser/scripts/lib/action-runner.mjs";

export const CG_SHIBBOLETH_LOGIN =
  "https://www.campusgroups.com/shibboleth/login?idp=colorado";
export const CG_EC_BASE = "https://campusgroups.colorado.edu/engineeringconnections";
/** @deprecated Use CG_EC_BASE — kept for host matching */
export const CG_BASE = CG_EC_BASE;

export const COEN_MAJOR_DINNERS_PATH = path.join(INBOX_DIR, "coen-major-dinners.md");
export const COEN_AI_LABS_PATH = path.join(INBOX_DIR, "coen-ai-labs.md");
export const SIGNUP_PREFS_PATH = path.join(
  resolveUserRoot(),
  "calibration",
  "signup-preferences.md"
);
export const COEN1500_PATH = path.join(INBOX_DIR, "courses", "COEN1500.md");

/** @param {string} url */
export function isRsvpConfirmationUrl(url, eventId) {
  const u = String(url || "");
  if (!/confirmation/i.test(u) || !/type=rsvp/i.test(u)) return false;
  if (!eventId) return true;
  return new RegExp(`type_id=${eventId}\\b`).test(u) || new RegExp(`[?&]id=${eventId}\\b`).test(u);
}

/** @param {string} url */
export function parseEventIdFromUrl(url) {
  const u = String(url || "");
  const patterns = [
    /[?&]id=(\d+)/,
    /type_id=(\d+)/,
    /\/r(\d+)\b/,
    /\/rsvp\/(\d+)/,
    /event[/-](\d+)/i,
  ];
  for (const re of patterns) {
    const m = u.match(re);
    if (m) return m[1];
  }
  return null;
}

/** @param {string|number} eventId */
export function buildRsvpUrl(eventId) {
  return `${CG_EC_BASE}/rsvp_boot?id=${eventId}`;
}

const MAJOR_ALIASES = {
  cs: /computer\s*science/i,
  "computer science": /computer\s*science/i,
  ee: /electrical\s*engineering/i,
  me: /mechanical\s*engineering/i,
  chem: /chemical\s*engineering/i,
  civ: /civil\s*engineering/i,
  arch: /architectural\s*engineering/i,
  aero: /aerospace/i,
  bio: /biomedical/i,
  env: /environmental/i,
};

/** @param {string} major */
export function majorMatches(majorName, alias) {
  const key = String(alias || "").toLowerCase().trim();
  const re = MAJOR_ALIASES[key] || new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return re.test(String(majorName || ""));
}

/** @param {string} md */
export function parseMajorDinnersTable(md) {
  const rows = [];
  for (const line of String(md || "").split("\n")) {
    if (!line.startsWith("|") || /^\|\s*Date\s*\|/i.test(line) || /^[-| ]+$/.test(line)) {
      continue;
    }
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, a) => i > 0 && i < a.length - 1);
    if (cols.length < 5) continue;
    const [date, slot, major, rsvpId, cglink] = cols;
    if (!rsvpId || !/^\d+$/.test(rsvpId)) continue;
    rows.push({ date, slot, major, rsvpId, cglink });
  }
  return rows;
}

/** @param {string} md */
export function parseSignupPreferences(md) {
  const prefs = {
    majorDinnerDefault: "Computer Science",
    majorDinnerStatus: "unconfirmed",
    aiLabStatus: "unconfirmed",
  };
  const text = String(md || "");
  const majorBlock = text.match(/## Major dinner[\s\S]*?(?=##|$)/i);
  if (majorBlock) {
    const def = majorBlock[0].match(/\*\*Default preference:\*\*\s*(.+)/i);
    if (def) prefs.majorDinnerDefault = def[1].trim();
    const status = majorBlock[0].match(/\*\*Status:\*\*\s*(\w+)/i);
    if (status) prefs.majorDinnerStatus = status[1].toLowerCase();
  }
  return prefs;
}

/** @param {import('playwright').Page} page */
export async function isInformationReleasePage(page) {
  const url = page.url();
  if (/information.?release|consent|release/i.test(url)) return true;
  const body = await page.locator("body").innerText().catch(() => "");
  return /information release|release of information|authorize.*share/i.test(body);
}

/** @param {import('playwright').Page} page */
export async function isOnboardingPage(page) {
  return /\/onboarding/i.test(page.url());
}

/** @param {import('playwright').Page} page */
export async function isLoggedInToCampusGroups(page) {
  const url = page.url();
  if (isCampusGroupsLoginUrl(url)) return false;
  if (/shibboleth|idp\.colorado|login\.microsoft/i.test(url)) return false;

  const loggedInSignals = [
    page.locator('[data-testid="user-menu"], .user-menu, .profile-dropdown'),
    page.locator('a[href*="/home"], a[href*="/profile"]'),
    page.locator("text=/My Events|Home|Dashboard/i"),
  ];
  for (const loc of loggedInSignals) {
    if ((await loc.count()) > 0) return true;
  }

  if (/campusgroups\.colorado\.edu|campusgroups\.com\/home|\/rsvp_boot|\/rsvp\b|\/event/i.test(url)) {
    return true;
  }
  return false;
}

/** @param {string} url */
export function isCampusGroupsLoginUrl(url) {
  return /\/login\b|sign.?in|shibboleth|idp\.|fedauth\.colorado/i.test(String(url || ""));
}

/** @param {import('playwright').Page} page */
export async function handleInformationRelease(page) {
  if (!(await isInformationReleasePage(page))) return false;

  const autoShare = page.locator(
    'input[name*="auto"], input[type="checkbox"]:near(:text("next time"))'
  );
  if ((await autoShare.count()) > 0) {
    await autoShare.first().check({ force: true }).catch(() => {});
  }

  const loginBtn = page.locator(
    'button:has-text("Log In"), input[type="submit"][value*="Log"], a:has-text("Log In")'
  );
  if ((await loginBtn.count()) > 0) {
    await loginBtn.first().click();
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

/** @param {import('playwright').Page} page */
export async function skipOnboarding(page) {
  if (!/\/onboarding/i.test(page.url())) return false;

  const skipSelectors = [
    'button:has-text("Skip")',
    'button:has-text("Continue")',
    'button:has-text("Done")',
    'button:has-text("Get Started")',
    'a.onboarding-skip',
  ];
  for (const sel of skipSelectors) {
    const btn = page.locator(sel);
    if ((await btn.count()) > 0) {
      await btn.first().click();
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await page.waitForTimeout(1000);
      return true;
    }
  }
  return false;
}

/**
 * Ensure CampusGroups session via Shibboleth (shared .auth cookies).
 * @param {import('playwright').Page} page
 * @param {{ targetUrl?: string }} [options]
 */
export async function ensureCampusGroupsSession(page, { targetUrl } = {}) {
  const entry = CG_SHIBBOLETH_LOGIN;
  await page.goto(entry, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  for (let i = 0; i < 6; i++) {
    if (await handleInformationRelease(page)) continue;
    if (await skipOnboarding(page)) continue;
    if (await isLoggedInToCampusGroups(page)) break;
    if (isCampusGroupsLoginUrl(page.url())) {
      await page.waitForTimeout(1500);
      continue;
    }
    await page.waitForTimeout(1000);
  }

  if (targetUrl) {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);
    await handleInformationRelease(page);
    await skipOnboarding(page);
  } else if (!(await isLoggedInToCampusGroups(page))) {
    await page.goto(`${CG_EC_BASE}/home`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);
    await handleInformationRelease(page);
    await skipOnboarding(page);
  }

  if (!(await isLoggedInToCampusGroups(page))) {
    throw new Error(
      "CampusGroups session missing — run: cd browser && npm run open-campusgroups (complete Shibboleth + consent once), then retry."
    );
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {{ eventId: string|number, studentName?: string }} opts
 */
export async function verifyRsvp(page, { eventId, studentName }) {
  const id = String(eventId);

  if (isRsvpConfirmationUrl(page.url(), id)) {
    return { success: true, method: "confirmation_url", eventId: id };
  }

  const rsvpUrl = buildRsvpUrl(id);
  if (!page.url().includes(String(id))) {
    await page.goto(rsvpUrl, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  if (isRsvpConfirmationUrl(page.url(), id)) {
    return { success: true, method: "confirmation_url", eventId: id };
  }

  const body = await page.locator("body").innerText().catch(() => "");
  if (studentName && /attendee|guest|registered/i.test(body) && body.includes(studentName)) {
    return { success: true, method: "attendee_list", eventId: id };
  }

  if (
    /already registered|you are registered|cancel registration|rsvp status:\s*registered/i.test(
      body
    )
  ) {
    if (studentName && body.includes(studentName)) {
      return { success: true, method: "attendee_list", eventId: id };
    }
    if (!studentName) {
      return { success: true, method: "rsvp_page_registered", eventId: id };
    }
  }

  await page.goto(`${CG_EC_BASE}/home/events`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  }).catch(() => {});
  await page.waitForTimeout(1500);
  const eventsText = await page.locator("body").innerText().catch(() => "");
  if (/registered/i.test(eventsText) && (eventsText.includes(id) || !studentName)) {
    return { success: true, method: "home_events", eventId: id };
  }

  return { success: false, method: "none", eventId: id };
}

/**
 * @param {import('playwright').Page} page
 * @param {string|number} eventId
 * @param {{ confirmed?: boolean }} [opts]
 */
export async function performRsvp(page, eventId, opts = {}) {
  if (!opts.confirmed) {
    throw new Error(
      "performRsvp requires { confirmed: true } — pass only after an explicit student --confirm (or equivalent)."
    );
  }
  const url = buildRsvpUrl(eventId);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  await handleInformationRelease(page);
  await skipOnboarding(page);

  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (
    /already registered|you are registered|registration complete|rsvp status:\s*registered/i.test(
      bodyText
    )
  ) {
    return { registered: true, alreadyRegistered: true, url: page.url() };
  }

  const cancelRegistered = page.locator(
    'a[aria-label*="RSVP Status: Registered"], a[href*="rsvp_id="][href*="Cancel"], a:has-text("Cancel")'
  );
  if ((await cancelRegistered.count()) > 0) {
    return { registered: true, alreadyRegistered: true, url: page.url() };
  }

  const qty = page.locator('select[name*="quantity"], input[name*="quantity"]');
  if ((await qty.count()) > 0) {
    const el = qty.first();
    const tag = await el.evaluate((n) => n.tagName.toLowerCase());
    if (tag === "select") {
      await el.selectOption({ index: 1 }).catch(() => el.selectOption("1"));
    } else {
      await el.fill("1");
    }
  }

  const jsRegister = page.locator('a[href="javascript:submitRegistrationForm()"]');
  if ((await jsRegister.count()) > 0) {
    await jsRegister.first().click();
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(2000);
    return { registered: true, alreadyRegistered: false, url: page.url() };
  }

  const registerBtn = page.locator(
    'button:has-text("Register"), input[type="submit"][value*="Register"], a:has-text("Register")'
  );
  if ((await registerBtn.count()) === 0) {
    const afterText = await page.locator("body").innerText().catch(() => "");
    if (/already registered|you are registered/i.test(afterText)) {
      return { registered: true, alreadyRegistered: true, url: page.url() };
    }
    throw new Error(`Register button not found on RSVP page for event ${eventId}`);
  }

  await registerBtn.first().click();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(2000);

  return { registered: true, alreadyRegistered: false, url: page.url() };
}

/**
 * Session → RSVP → verify as one runner plan (browser/scripts/lib/action-runner.mjs).
 * Each step re-observes the page; a failed check halts before the next step.
 * The finish step is verifyRsvp — the plugin's success contract — unless the
 * caller explicitly passed --no-verify, in which case the verdict records
 * `method: "skipped"` rather than inferring success.
 *
 * @param {import('playwright').Page} page
 * @param {{ eventId: string|number, studentName?: string, verify?: boolean,
 *   confirmed?: boolean, runOptions?: object }} opts
 */
export async function runRsvpFlow(page, { eventId, studentName, verify = true, confirmed, runOptions = {} }) {
  const id = String(eventId);
  return runActionPlan(page, {
    // One label for every RSVP so "keep newest 10" bounds the folder, not 10 per event.
    label: "campusgroups-rsvp",
    meta: { eventId: id },
    ...runOptions,
    steps: [
      {
        name: "session",
        act: (p) => ensureCampusGroupsSession(p),
        check: async (p) => ({ ok: await isLoggedInToCampusGroups(p), detail: { url: p.url() } }),
      },
      {
        name: "rsvp",
        act: (p) => performRsvp(p, id, { confirmed }),
        check: (_p, ctx) => ({ ok: !!ctx.results.rsvp?.registered, detail: ctx.results.rsvp }),
      },
      {
        name: "verify",
        finish: true,
        act: verify ? (p) => verifyRsvp(p, { eventId: id, studentName }) : undefined,
        check: (_p, ctx) =>
          verify
            ? { ok: !!ctx.results.verify?.success, detail: ctx.results.verify }
            : { ok: true, detail: { success: true, method: "skipped" } },
      },
    ],
  });
}

/**
 * What the student needs to know after a run, in the order they need it:
 * did anything reach the organizer, and is it safe to try again?
 *
 * Outcomes:
 *   confirmed              verified registered by this run
 *   already_registered     was registered before this run (verified)
 *   registered_unverified  Register ran, verification skipped via --no-verify
 *   unconfirmed            Register may have been clicked; verification failed
 *   not_attempted          stopped before anything reached CampusGroups
 *
 * @param {Awaited<ReturnType<typeof runRsvpFlow>>} run
 * @param {{ eventUrl?: string }} [opts]
 */
export function describeRsvpOutcome(run, { eventUrl = "" } = {}) {
  const rsvpStep = run.steps.find((s) => s.step === "rsvp");
  const rsvp = rsvpStep?.act?.result || {};
  const openYourself = eventUrl ? ` Open it yourself: ${eventUrl}` : "";

  if (run.haltedAt === "session") {
    return {
      outcome: "not_attempted",
      message: "Your CampusGroups login has expired or never finished. Nothing was registered.",
      next: "Run `cd browser && npm run open-campusgroups`, finish the CU login in the window that opens, then ask to retry.",
    };
  }
  if (run.haltedAt === "rsvp" && rsvpStep?.act && !rsvpStep.act.ok) {
    const err = rsvpStep.act.error || "";
    if (/requires \{ confirmed: true \}/.test(err)) {
      return {
        outcome: "not_attempted",
        message: "Refused: this run wasn't confirmed. Nothing was registered.",
        next: "Preview the event first, then re-run with --confirm once you've decided.",
      };
    }
    // performRsvp throws this one before clicking. Any other throw can't be placed
    // relative to the click, so it falls through to "unconfirmed" below.
    if (/Register button not found/.test(err)) {
      return {
        outcome: "not_attempted",
        message:
          "Couldn't find a Register button — the event may be full, closed, or need a form. Nothing was registered.",
        next: `Check the event page in CampusGroups.${openYourself}`,
      };
    }
  }
  if (!run.ok) {
    return {
      outcome: "unconfirmed",
      message:
        "Register was clicked, but CampusGroups didn't show a confirmation. You may or may not be registered.",
      next:
        "Check CampusGroups → My Events before doing anything else. Retrying is safe: it checks for an existing registration before clicking Register." +
        openYourself,
    };
  }
  if (run.verdict?.detail?.method === "skipped") {
    return {
      outcome: "registered_unverified",
      message: "Register was clicked; verification was skipped (--no-verify), so this isn't confirmed.",
      next: "Check CampusGroups → My Events to be sure.",
    };
  }
  if (rsvp.alreadyRegistered) {
    return {
      outcome: "already_registered",
      message: "You were already registered for this event. Nothing changed.",
      next: "",
    };
  }
  return {
    outcome: "confirmed",
    message: "You're registered, and CampusGroups confirmed it.",
    next: "",
  };
}

/** Outcomes where the student is registered as far as we can tell. */
export const RSVP_REGISTERED_OUTCOMES = new Set([
  "confirmed",
  "already_registered",
  "registered_unverified",
]);

/**
 * Shape a runner result into the CLI JSON. Keeps the fields the rsvp-* scripts
 * have always printed and adds the student-facing outcome.
 * @param {Awaited<ReturnType<typeof runRsvpFlow>>} run
 * @param {string|number} eventId
 * @param {{ event?: object }} [opts]
 */
export function rsvpResultFromRun(run, eventId, { event } = {}) {
  const id = String(eventId);
  const rsvp = run.steps.find((s) => s.step === "rsvp")?.act?.result || {};
  const failed = run.steps.find((s) => (s.act && !s.act.ok) || (s.check && !s.check.ok));
  const described = describeRsvpOutcome(run, { eventUrl: buildRsvpUrl(id) });
  const out = {
    ok: run.ok,
    ...described,
    eventId: id,
    ...(event ? { event } : {}),
    alreadyRegistered: rsvp.alreadyRegistered || false,
    verification: run.verdict?.detail || { success: false, method: "none" },
    url: run.steps.at(-1)?.observation?.url || "",
    diagnostics: run.diagnostics,
  };
  if (!run.ok) {
    if (run.lastScreenshot) out.screenshot = run.lastScreenshot;
    if (failed) {
      out.haltedAt = failed.step;
      if (failed.act && !failed.act.ok) out.error = failed.act.error;
    }
  }
  return out;
}

/** Quote one argv token for a copy-pasteable POSIX shell command. */
export function shellQuote(s) {
  const v = String(s);
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(v) ? v : `'${v.replace(/'/g, `'\\''`)}'`;
}

/**
 * The confirm step must book the event the student previewed. The preview
 * prints `--expect <id>`; a confirm run whose resolution drifted (schedule
 * re-synced, prefs changed, date matched a different row) is refused before a
 * browser opens.
 *
 * @param {{ resolvedId: string|number, expect?: string|null, required: boolean, previewCommand: string }} o
 * @returns {null | object} null when OK to proceed, else the CLI result to print
 */
export function checkExpectedEvent({ resolvedId, expect, required, previewCommand }) {
  const id = String(resolvedId);
  if (!expect) {
    if (!required) return null;
    return {
      ok: false,
      outcome: "not_attempted",
      message: "Refused: --confirm needs --expect <event id> from the preview, so what you book is what you saw. Nothing was registered.",
      next: `Preview first: ${previewCommand}`,
      eventId: id,
    };
  }
  if (String(expect) !== id) {
    return {
      ok: false,
      outcome: "not_attempted",
      message: `Refused: the preview was for event ${expect}, but this run now resolves to event ${id}. Nothing was registered.`,
      next: `Preview again and confirm the event you actually want: ${previewCommand}`,
      eventId: id,
    };
  }
  return null;
}

/** Map a launch/lock failure (before any page loads) to a student-facing result. */
export function rsvpLaunchFailure(err, eventId) {
  const msg = String(err?.message || err);
  const busy = /another Canvas browser script/.test(msg);
  return {
    ok: false,
    outcome: "not_attempted",
    message: busy
      ? "Another Canvas sync is using the browser right now. Nothing was registered."
      : "The browser couldn't start. Nothing was registered.",
    next: busy
      ? "Wait for the sync to finish (usually under a minute), then ask to retry."
      : "Run `cd browser && npm run open-campusgroups` to check the browser works, then retry.",
    eventId: String(eventId),
    error: msg,
  };
}

/**
 * One end-to-end RSVP CLI run, shared by rsvp-campusgroups / rsvp-dinner / rsvp-ai-lab.
 *
 *   no --confirm           → preview only: the resolved event, alternatives, and the
 *                            exact confirm command (with --expect). No browser.
 *   --confirm              → --expect check → launch → runRsvpFlow → log → result
 *
 * Returns `{ result, exitCode }`; the caller prints and exits. `deps` exists for tests.
 *
 * @param {{
 *   eventId: string, studentName: string, verify: boolean, confirm: boolean,
 *   expect?: string|null, expectRequired: boolean,
 *   event: { label: string, date?: string, slot?: string, time?: string },
 *   alternatives?: object[],
 *   previewCommand: string, confirmCommand: string,
 *   log: boolean,
 * }} o
 * @param {{ launch?: Function, runFlow?: Function, appendLog?: Function }} [deps]
 */
export async function runRsvpCli(o, deps = {}) {
  const {
    launch = launchCanvasContext,
    runFlow = runRsvpFlow,
    appendLog = appendRegistrationLog,
  } = deps;
  const id = String(o.eventId);

  if (!o.confirm) {
    const result = {
      ok: true,
      outcome: "preview",
      registered: false,
      message: `Nothing registered yet. This would register you for: ${o.event.label}. The organizer will see your RSVP.`,
      next: "If that's the right event, run the confirm command.",
      eventId: id,
      event: o.event,
      eventUrl: buildRsvpUrl(id),
      ...(o.alternatives?.length ? { alternatives: o.alternatives } : {}),
      confirmWith: o.confirmCommand,
    };
    return { result, exitCode: 0 };
  }

  const refusal = checkExpectedEvent({
    resolvedId: id,
    expect: o.expect,
    required: o.expectRequired,
    previewCommand: o.previewCommand,
  });
  if (refusal) return { result: refusal, exitCode: 1 };

  let context;
  let page;
  try {
    ({ context, page } = await launch());
  } catch (e) {
    return { result: rsvpLaunchFailure(e, id), exitCode: 1 };
  }

  let result;
  try {
    const run = await runFlow(page, {
      eventId: id,
      studentName: o.studentName,
      verify: o.verify,
      confirmed: o.confirm,
    });
    result = rsvpResultFromRun(run, id, { event: o.event });
  } catch (e) {
    result = {
      ok: false,
      outcome: "unconfirmed",
      message: "The run stopped unexpectedly. You may or may not be registered.",
      next: `Check CampusGroups → My Events before retrying. Event page: ${buildRsvpUrl(id)}`,
      eventId: id,
      error: String(e?.message || e),
    };
  } finally {
    await context.close().catch(() => {});
  }

  if (o.log && RSVP_REGISTERED_OUTCOMES.has(result.outcome)) {
    appendLog({
      ...o.event,
      eventId: id,
      status: result.outcome === "registered_unverified" ? "unverified" : "confirmed",
    });
  }

  const exitCode = RSVP_REGISTERED_OUTCOMES.has(result.outcome) ? 0 : 1;
  return { result, exitCode };
}

/**
 * @param {{ major?: string, date?: string, slot?: string, eventId: string, label?: string,
 *   status?: "confirmed"|"unverified" }} entry
 */
export function appendRegistrationLog(entry) {
  const today = schoolLocalDay();
  const status = entry.status || "confirmed";
  const line = `- ${today}: ${entry.label || `${entry.major} Major Dinner ${entry.date}${entry.slot ? ` slot ${entry.slot}` : ""}`} — ${status} (event ${entry.eventId})`;
  let content = "";
  try {
    content = fs.readFileSync(COEN1500_PATH, "utf8");
  } catch {
    return;
  }
  fs.writeFileSync(COEN1500_PATH, upsertRegistrationLogLine(content, line, entry.eventId), "utf8");
}

/**
 * Insert `line` under `## Registration log`. One line per event: an existing
 * `unverified` line upgrades to `confirmed`; anything else is left alone.
 */
export function upsertRegistrationLogLine(content, line, eventId) {
  const marker = "## Registration log";
  const tag = `(event ${eventId})`;
  if (!content.includes(marker)) {
    return content.trimEnd() + `\n\n${marker}\n\n${line}\n`;
  }
  const idx = content.indexOf(marker);
  const after = content.slice(idx + marker.length);
  const next = after.search(/\n## /);
  const section = next === -1 ? after : after.slice(0, next);
  const existing = section.split("\n").find((l) => l.includes(tag));
  if (existing) {
    if (/— unverified /.test(existing) && /— confirmed /.test(line)) {
      return content.replace(existing, line);
    }
    return content;
  }
  const insertAt = idx + marker.length;
  return content.slice(0, insertAt) + `\n${line}` + content.slice(insertAt);
}

/**
 * Drop schedule rows whose ISO date (YYYY-MM-DD) is before `today`. Rows with
 * non-ISO dates ("Sept 10") are kept — can't tell, so let the preview show them.
 * @template {{ date?: string }} T
 * @param {T[]} rows
 * @param {string} today  YYYY-MM-DD in the school's timezone
 * @returns {T[]}
 */
export function dropPastRows(rows, today) {
  return rows.filter((r) => {
    const m = String(r.date || "").match(/^(\d{4}-\d{2}-\d{2})/);
    return !m || m[1] >= today;
  });
}

export { AUTH_DIR, launchCanvasContext, schoolLocalDay };
