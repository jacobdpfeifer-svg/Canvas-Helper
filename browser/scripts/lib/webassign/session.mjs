/**
 * Canvas SSO → WebAssign LTI navigation.
 */
const WA_LOGIN = "https://www.webassign.net/colorado/login.html";
const WA_STUDENT = /webassign\.net\/web\/Student/i;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function acceptCookies(page) {
  for (const label of [/Accept All Cookies/i, /Accept all cookies/i, /^Accept$/i]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await sleep(500);
      return;
    }
  }
}

export async function tryInstitutionSso(page) {
  for (const re of [
    /sign in with (your )?(school|institution|okta)/i,
    /university of colorado/i,
    /find your institution/i,
    /institutional login/i,
    /school credentials/i,
  ]) {
    const el = page.getByText(re).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click().catch(() => {});
      await sleep(1500);
      return true;
    }
  }
  return false;
}

export function findWebAssignPage(context) {
  return context.pages().find((p) => WA_STUDENT.test(p.url())) || null;
}

/**
 * Navigate Canvas assignment URL → WebAssign student page.
 * @returns {import('playwright').Page}
 */
export async function openWebAssignFromCanvas(page, context, assignmentUrl, log) {
  log?.event("goto_canvas_assignment", { url: assignmentUrl });

  const popupP = context.waitForEvent("page", { timeout: 25_000 }).catch(() => null);
  await page.goto(assignmentUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await sleep(2000);

  const link = page.locator('a[href*="webassign.net"]').first();
  if ((await link.count()) > 0) {
    await link.click().catch(() => {});
  } else {
    const launch = page.locator(
      'a[href*="external_tools"], a[href*="tool_launch"], button:has-text("Load"), a:has-text("Load")'
    ).first();
    if ((await launch.count()) > 0) {
      await launch.click().catch(() => {});
    }
  }

  let wa = (await popupP) || findWebAssignPage(context) || page;
  if (!WA_STUDENT.test(wa.url())) {
    await wa.goto(WA_LOGIN, { waitUntil: "domcontentloaded", timeout: 90_000 });
  }

  await sleep(2500);
  await acceptCookies(wa);
  await tryInstitutionSso(wa);

  log?.event("waiting_webassign", { url: wa.url() });
  console.log(`
============================================================
If prompted: complete WebAssign/Cengage sign-in in the Playwright
Chrome window (IdentiKey / school SSO). Do NOT close the window.
Waiting up to 8 minutes for the assignment page…
============================================================
`);

  const start = Date.now();
  let inWA = false;
  while (Date.now() - start < 480_000) {
    await sleep(4000);
    for (const p of context.pages()) {
      if (WA_STUDENT.test(p.url())) {
        wa = p;
        inWA = true;
        break;
      }
    }
    console.log("wait-wa", wa.url().slice(0, 120));
    if (inWA) break;
  }

  if (!inWA) {
    throw new Error("WebAssign login not completed in time");
  }

  await acceptCookies(wa);
  log?.event("webassign_ready", { url: wa.url() });
  return wa;
}

/**
 * Ensure we're on an assignment responses page; click assignment link if needed.
 */
async function safePageTitle(wa) {
  for (let i = 0; i < 8; i++) {
    try {
      await wa.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
      return await wa.evaluate(() => {
        const h = document.querySelector("h1, .assignmentTitle, .pageTitle");
        return (h?.innerText || document.title || "").trim();
      });
    } catch {
      await sleep(1000);
    }
  }
  return "";
}

export async function ensureAssignmentPage(wa, expectedTitleRe, log) {
  await wa.waitForLoadState("domcontentloaded").catch(() => {});
  await sleep(1500);

  // After submit/autosave, return to the full assignment view so pads are editable.
  const url = wa.url();
  if (/\/submit\b|tags=autosave/i.test(url)) {
    const dep = url.match(/dep=(\d+)/)?.[1];
    const target = dep
      ? `https://www.webassign.net/web/Student/Assignment-Responses/last?dep=${dep}`
      : url.replace(/\/submit\b.*/, "/last");
    log?.event("leave_autosave_submit", { from: url, to: target });
    await wa.goto(target, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
    await wa.waitForURL(/Assignment-Responses\/last/i, { timeout: 30_000 }).catch(() => {});
    await sleep(2500);
  }

  let title = await safePageTitle(wa);

  if (expectedTitleRe && !expectedTitleRe.test(title)) {
    const link = wa.getByRole("link", { name: expectedTitleRe }).first();
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await sleep(3000);
      title = await safePageTitle(wa);
    }
  }

  log?.event("assignment_page", { title, url: wa.url() });
  return { title, url: wa.url() };
}
