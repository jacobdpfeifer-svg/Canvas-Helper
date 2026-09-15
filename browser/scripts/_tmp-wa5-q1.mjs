/**
 * WA5 Q1: wait for Jacob to finish Cengage/WebAssign login, then solve+submit Q1.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { AUTH_DIR, clearSingletonLocks, BASE } from "./lib/canvas-session.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "..", "inbox", "courses", "_raw", "wa5-q1-result.json");
const ASSIGN = "https://canvas.colorado.edu/courses/141255/assignments/2754102";
const WA_DEP =
  "https://www.webassign.net/web/Student/Assignment-Responses/last?dep=39902076";

function save(obj) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  let prev = {};
  try {
    prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  } catch {}
  fs.writeFileSync(
    OUT,
    JSON.stringify({ ...prev, ...obj, savedAt: new Date().toISOString() }, null, 2)
  );
  console.log("saved", obj.step);
}

function roughMath(mml) {
  return mml
    .replace(/<\/?math[^>]*>/g, "")
    .replace(/<msqrt>/g, "sqrt(")
    .replace(/<\/msqrt>/g, ")")
    .replace(/<mi>|<mn>|<mo>|<mrow>/g, "")
    .replace(/<\/mi>|<\/mn>|<\/mo>|<\/mrow>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&minus;/g, "-")
    .replace(/&InvisibleTimes;|&it;/gi, "")
    .replace(/\s+/g, "")
    .trim();
}

clearSingletonLocks(AUTH_DIR);
const context = await chromium.launchPersistentContext(AUTH_DIR, {
  channel: "chrome",
  headless: false,
  viewport: { width: 1400, height: 960 },
  args: ["--disable-blink-features=AutomationControlled"],
});
const page = context.pages()[0] || (await context.newPage());

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90000 });
  for (let i = 0; i < 60; i++) {
    const u = page.url();
    if (/canvas\.colorado\.edu/i.test(u) && !/login|fedauth|microsoft/i.test(u)) break;
    console.log("waiting canvas", u.slice(0, 100));
    await page.waitForTimeout(4000);
  }
  console.log("canvas ok", page.url());

  // Open WA login link in same context
  await page.goto(ASSIGN, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1500);

  const popupP = context.waitForEvent("page", { timeout: 20000 }).catch(() => null);
  const link = page.locator('a[href*="webassign.net/colorado"]').first();
  if (await link.count()) {
    await link.click().catch(() => {});
  }
  let wa = (await popupP) || page;
  if (wa === page) {
    await wa.goto("https://www.webassign.net/colorado/login.html", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
  }

  // Dump login UI once so we know buttons
  await wa.waitForTimeout(2500);
  const loginUI = await wa.evaluate(() => ({
    url: location.href,
    text: (document.body?.innerText || "").slice(0, 2500),
    buttons: [...document.querySelectorAll("button, a, input[type=submit]")]
      .map((el) => (el.innerText || el.value || "").trim())
      .filter(Boolean)
      .slice(0, 40),
  }));
  save({ step: "cengage-login-ui", ...loginUI });
  console.log("LOGIN UI buttons:", loginUI.buttons);
  console.log("LOGIN url:", loginUI.url);
  console.log(`
============================================================
ACTION NEEDED: In the Chrome window, finish WebAssign/Cengage
sign-in (IdentiKey / school SSO if prompted). Do NOT close Chrome.
Waiting up to 8 minutes for the assignment page…
============================================================
`);

  // Try clicking institution SSO once if present (not password Sign In)
  for (const re of [
    /sign in with (your )?(school|institution|okta)/i,
    /university of colorado/i,
    /find your institution/i,
    /institutional login/i,
    /school credentials/i,
  ]) {
    const el = wa.getByText(re).first();
    if (await el.isVisible().catch(() => false)) {
      console.log("click institution option", String(re));
      await el.click().catch(() => {});
      break;
    }
  }

  const start = Date.now();
  let inWA = false;
  while (Date.now() - start < 480_000) {
    await wa.waitForTimeout(4000);
    // Also check all pages
    for (const p of context.pages()) {
      const u = p.url();
      if (/webassign\.net\/web\/Student/i.test(u)) {
        wa = p;
        inWA = true;
        break;
      }
    }
    console.log("wait-wa", wa.url().slice(0, 120));
    if (inWA) break;
  }

  if (!inWA) {
    // try dep URL now — cookies may exist after manual login
    await wa.goto(WA_DEP, { waitUntil: "domcontentloaded", timeout: 90000 });
    await wa.waitForTimeout(4000);
    inWA = /webassign\.net\/web\/Student/i.test(wa.url());
  }

  if (!inWA) {
    save({ step: "wa-login-timeout", url: wa.url() });
    throw new Error("WebAssign login not completed in time");
  }

  if (!/Assignment-Responses/i.test(wa.url())) {
    await wa.goto(WA_DEP, { waitUntil: "domcontentloaded", timeout: 90000 });
    await wa.waitForTimeout(3000);
  }
  console.log("IN_WA", wa.url());

  const q1 = await wa.evaluate(() => {
    const submit = document.querySelector("#submit_5412822_0");
    let root = submit;
    for (let i = 0; i < 14 && root; i++) {
      root = root.parentElement;
      if (!root) break;
      const t = root.innerText || "";
      if (/Isolate the radical/i.test(t) && /Square both sides/i.test(t)) break;
    }
    if (!root) root = document.body;
    const maths = [...root.querySelectorAll("math")].map((m) => m.outerHTML);
    return {
      text: (root.innerText || "").slice(0, 4000),
      maths,
      hasSubmit: !!submit,
      // Find answer pads / hidden math fields
      hiddens: [...root.querySelectorAll("input[type=hidden]")]
        .filter((el) => /ans|math|pad|RM_|RN_|RQ_|AQ_/i.test(el.name + el.id))
        .map((el) => ({
          name: el.name,
          id: el.id,
          value: (el.value || "").slice(0, 200),
        })),
      textInputs: [...root.querySelectorAll("input[type=text], textarea")]
        .filter((el) => {
          try {
            return el.getClientRects().length > 0;
          } catch {
            return false;
          }
        })
        .map((el) => ({
          name: el.name,
          id: el.id,
          className: String(el.className).slice(0, 80),
        })),
    };
  });

  save({
    step: "q1-ready",
    url: wa.url(),
    q1: { ...q1, mathsRough: (q1.maths || []).map(roughMath) },
  });
  console.log("Q1:\n", q1.text.slice(0, 1800));
  console.log("mathsRough", (q1.maths || []).map(roughMath));
  console.log("hiddens", q1.hiddens);
  console.log("textInputs", q1.textInputs);

  let a = 5;
  for (const r of (q1.maths || []).map(roughMath)) {
    const m = r.match(/sqrt\((\d+)x\)\+x=0/i);
    if (m) {
      a = Number(m[1]);
      break;
    }
  }
  const tm = (q1.text || "").match(/(\d+)\s*x[\s\S]{0,30}\+\s*x\s*=\s*0/);
  if (tm) a = Number(tm[1]);
  const parts = [`sqrt(${a}x)=-x`, `${a}x=x^2`, `0,${a}`, `0`];
  console.log("a=", a, "parts", parts);
  save({ step: "q1-plan", a, parts });

  // Enter answers into first 4 math pads of Q1
  const prompts = wa.getByText("Press Space or Enter to edit this math answer", {
    exact: true,
  });
  const n = await prompts.count();
  console.log("prompts", n);
  for (let i = 0; i < Math.min(4, n); i++) {
    await prompts.nth(i).scrollIntoViewIfNeeded();
    await prompts.nth(i).click({ timeout: 5000 });
    await wa.waitForTimeout(600);
    await wa.keyboard.press("Meta+a").catch(() => {});
    await wa.keyboard.press("Backspace").catch(() => {});
    // Use caret for sqrt if needed — WA often accepts sqrt()
    await wa.keyboard.type(parts[i], { delay: 35 });
    await wa.keyboard.press("Tab");
    await wa.waitForTimeout(400);
    console.log("typed", i, parts[i]);
  }

  await wa.locator("#submit_5412822_0").scrollIntoViewIfNeeded();
  await wa.locator("#submit_5412822_0").click({ timeout: 10000 });
  console.log("SUBMITTED");
  await wa.waitForTimeout(6000);

  const after = await wa.evaluate(() => {
    const text = document.body.innerText || "";
    const scoreM = text.match(/Current Score:[\s\S]{0,60}?([\d.]+)\s*\/\s*([\d.]+)/i);
    const q1m = text.match(/1\.\n\[[^\]]*\][\s\S]*?(?=\n2\.\n\[)/);
    return {
      score: scoreM ? [scoreM[1], scoreM[2]] : null,
      pointsLine: (text.match(/1\.\n\[[^\]]+\]/) || [""])[0],
      q1block: (q1m ? q1m[0] : "").slice(0, 2800),
      url: location.href,
    };
  });
  save({ step: "q1-done", ...after, a, parts });
  console.log("RESULT", after.pointsLine, after.score);
  console.log(after.q1block.slice(0, 1200));

  await wa.waitForTimeout(25000);
} catch (e) {
  save({ step: "error", error: String(e), stack: e.stack });
  console.error(e);
  process.exitCode = 1;
} finally {
  await context.close().catch(() => {});
}
