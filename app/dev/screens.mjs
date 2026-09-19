/**
 * Capture the round-1 screens from the fixture harness with Playwright +
 * system Chrome (no browser download). Requires a Vite dev server for app/:
 *   cd app && npm run dev -- --port 1430
 *   node dev/screens.mjs http://localhost:1430 ../docs/build/ui-round1/candidate-c/screens
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../browser/node_modules/playwright");

const base = process.argv[2] || "http://localhost:1430";
const out = path.resolve(process.argv[3] || "screens");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const shot = async (page, name) => {
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(name);
};

for (const theme of ["night", "paper"]) {
  const ctx = await browser.newContext({ viewport: { width: 560, height: 680 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // Onboarding 1–3
  await page.goto(`${base}/dev/fixture.html?onboarded=0&theme=${theme}`);
  await page.getByRole("heading", { name: "Your school" }).waitFor();
  await shot(page, `${theme}-01-school`);
  await page.getByRole("button", { name: "View terms" }).click();
  await page.getByRole("dialog").waitFor();
  await shot(page, `${theme}-01b-terms`);
  await page.keyboard.press("Escape");
  await page.getByRole("checkbox", { name: "Accept terms" }).click();
  await shot(page, `${theme}-01c-accepted`);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Connect Canvas" }).waitFor();
  await page.waitForTimeout(1600);
  await shot(page, `${theme}-02-connect`);
  await page.getByRole("button", { name: "Sign in to Canvas" }).click();
  await page.getByRole("heading", { name: "Loading your courses" }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(2300);
  await shot(page, `${theme}-03-syncing`);
  await page.getByRole("heading", { name: "Home" }).waitFor({ timeout: 15000 });
  await ctx.close();

  const wctx = await browser.newContext({ viewport: { width: 1080, height: 740 }, deviceScaleFactor: 2 });
  const w = await wctx.newPage();
  for (const range of ["1m", "3m", "semester"]) {
    await w.goto(`${base}/dev/fixture.html?theme=${theme}&range=${range}`);
    await w.getByRole("group", { name: /CSCI 2270/ }).waitFor();
    await w.waitForTimeout(200);
    await shot(w, `${theme}-04-home-${range}`);
  }
  await w.goto(`${base}/dev/fixture.html?theme=${theme}&range=1m`);
  const exam = w.getByRole("button", { name: /Exam: Midterm 1/ });
  await exam.waitFor();
  await exam.hover();
  await w.getByRole("tooltip").waitFor();
  await shot(w, `${theme}-05-hover-bubble`);
  await exam.click();
  await w.getByRole("dialog").waitFor();
  await w.getByText(/Covers arrays/).waitFor();
  await shot(w, `${theme}-06-exam-popup`);
  await w.getByRole("button", { name: "View plan" }).click();
  await w.getByText("Draft plan", { exact: true }).waitFor();
  await w.waitForTimeout(200);
  await shot(w, `${theme}-07-exam-prep`);
  await w.getByRole("tab", { name: "Calendar" }).click();
  await w.getByRole("button", { name: "Add to calendar" }).waitFor();
  await w.waitForTimeout(300);
  await shot(w, `${theme}-08-calendar`);
  await w.getByRole("button", { name: "Add to calendar" }).click();
  await w.getByRole("dialog", { name: "Add to calendar" }).waitFor();
  await shot(w, `${theme}-08b-add-event`);
  await w.keyboard.press("Escape");
  await w.getByRole("tab", { name: "Settings" }).click();
  await w.getByRole("heading", { name: "Settings" }).waitFor();
  await w.evaluate(() => document.getElementById("main")?.scrollTo(0, 1e6));
  await w.waitForTimeout(200);
  await shot(w, `${theme}-09-settings-bottom`);
  await wctx.close();
}
await browser.close();
