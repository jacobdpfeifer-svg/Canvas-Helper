/**
 * CampusGroups session helpers — Shibboleth SSO via shared browser/.auth profile.
 * Playwright automation only; IDE browser has no SSO.
 */
import fs from "node:fs";
import path from "node:path";
import {
  AUTH_DIR,
  ROOT,
  denverDay,
  launchCanvasContext,
} from "./canvas-session.mjs";

export const CG_SHIBBOLETH_LOGIN =
  "https://www.campusgroups.com/shibboleth/login?idp=colorado";
export const CG_EC_BASE = "https://campusgroups.colorado.edu/engineeringconnections";
/** @deprecated Use CG_EC_BASE — kept for host matching */
export const CG_BASE = CG_EC_BASE;
export const COEN_MAJOR_DINNERS_PATH = path.join(ROOT, "inbox", "coen-major-dinners.md");
export const COEN_AI_LABS_PATH = path.join(ROOT, "inbox", "coen-ai-labs.md");
export const SIGNUP_PREFS_PATH = path.join(ROOT, ".jacob", "signup-preferences.md");
export const COEN1500_PATH = path.join(ROOT, "inbox", "courses", "COEN1500.md");

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
 */
export async function performRsvp(page, eventId) {
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

/** @param {{ major: string, date: string, eventId: string, label?: string }} entry */
export function appendRegistrationLog(entry) {
  const today = denverDay();
  const line = `- ${today}: ${entry.label || `${entry.major} Major Dinner ${entry.date}${entry.slot ? ` slot ${entry.slot}` : ""}`} — confirmed (event ${entry.eventId})`;
  let content = "";
  try {
    content = fs.readFileSync(COEN1500_PATH, "utf8");
  } catch {
    return;
  }

  const marker = "## Registration log";
  if (content.includes(marker)) {
    const idx = content.indexOf(marker);
    const after = content.slice(idx + marker.length);
    const next = after.search(/\n## /);
    const section = next === -1 ? after : after.slice(0, next);
    if (section.includes(`event ${entry.eventId}`)) return;
    const insertAt = idx + marker.length;
    content =
      content.slice(0, insertAt) +
      `\n${line}` +
      content.slice(insertAt);
  } else {
    content = content.trimEnd() + `\n\n## Registration log\n\n${line}\n`;
  }
  fs.writeFileSync(COEN1500_PATH, content, "utf8");
}

export { AUTH_DIR, launchCanvasContext };
