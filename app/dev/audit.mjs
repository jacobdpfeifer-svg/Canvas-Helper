/**
 * Scripted front-end audit over the fixture harness: every tab and control,
 * console errors, IPC calls per interaction (from the shim's call log), and
 * tab-switch paint timings. Prints JSON; AUDIT.md is written from it.
 *   node dev/audit.mjs http://localhost:1430
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../browser/node_modules/playwright");

const base = process.argv[2] || "http://localhost:1430";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 740 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") consoleErrors.push(`${m.type()}: ${m.text().slice(0, 200)}`);
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 200)}`));
const results = [];
const calls = () => page.evaluate(() => window.__shimCalls.map((c) => c.cmd));
async function step(name, fn, { expectCalls } = {}) {
  const before = (await calls()).length;
  const t0 = Date.now();
  let ok = true;
  let note = "";
  try {
    note = (await fn()) || "";
  } catch (e) {
    ok = false;
    note = String(e).split("\n")[0].slice(0, 160);
  }
  const ms = Date.now() - t0;
  const after = await calls();
  const ipc = after.slice(before);
  results.push({ name, ok, ms, ipc, note, expectCalls });
}
const tab = (n) => page.getByRole("tab", { name: n });

await page.goto(`${base}/dev/fixture.html?theme=night&range=1m`);
await step("Home: first paint", async () => {
  await page.getByRole("group", { name: /CSCI 2270/ }).waitFor();
});
await step("Home: range → 3 months", async () => {
  await page.getByRole("radio", { name: "3 months" }).click();
  await page.getByRole("button", { name: /Final Exam/ }).waitFor();
});
await step("Home: hover a tick", async () => {
  await page.getByRole("button", { name: /Quiz: Quiz 1/ }).hover();
  await page.getByRole("tooltip").waitFor();
});
await step("Home: Open in Canvas (bubble)", async () => {
  await page.getByRole("tooltip").getByRole("button", { name: /Open in Canvas/ }).click();
});
await step("Home: click exam → popup", async () => {
  await page.getByRole("button", { name: /Exam: Midterm 1/ }).click();
  await page.getByRole("dialog").getByText(/Covers arrays/).waitFor();
});
await step("Popup: View plan → Exam Prep", async () => {
  await page.getByRole("button", { name: "View plan" }).click();
  await page.getByText("Draft plan", { exact: true }).waitFor();
});
await step("Exam Prep: Redo this plan", async () => {
  await page.getByRole("button", { name: "Redo this plan" }).click();
  await page.waitForTimeout(150);
});
await step("Exam Prep: Open in Canvas", async () => {
  await page.getByRole("button", { name: /Open in Canvas/ }).click();
});
await step("Exam Prep: Let's test your knowledge → Study", async () => {
  await page.getByRole("button", { name: "Let’s test your knowledge" }).click();
  await page.getByRole("heading", { name: "Study" }).waitFor();
});
await step("Study: first paint (fixture has no items)", async () => {
  await page.getByRole("heading", { name: "No practice item is ready" }).waitFor();
});
await step("Study: Canvas data → Settings", async () => {
  await page.getByRole("button", { name: "Canvas data" }).click();
  await page.getByRole("heading", { name: "Settings" }).waitFor();
});
await step("Tab: Calendar (paint)", async () => {
  await tab("Calendar").click();
  await page.getByPlaceholder("One thing you’ll do today").waitFor();
});
await step("Calendar: surface populated", async () => {
  await page.getByText("No checks scheduled").waitFor();
});
await step("Calendar: commit one thing", async () => {
  await page.getByPlaceholder("One thing you’ll do today").fill("Redo linked-list lab");
  await page.getByRole("button", { name: "Commit" }).click();
  await page.getByText("Redo linked-list lab").waitFor();
});
await step("Calendar: suggestion Dismiss", async () => {
  await page.getByRole("button", { name: "Dismiss" }).first().click();
  await page.waitForTimeout(100);
});
await step("Calendar: suggestion Add", async () => {
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.waitForTimeout(100);
});
await step("Calendar: Add to calendar sheet → Add", async () => {
  await page.getByRole("button", { name: "Add to calendar" }).click();
  await page.getByLabel("Title").fill("Office hours");
  await page.getByRole("dialog").getByRole("button", { name: "Add" }).click();
  await page.getByTitle(/Office hours/).waitFor();
});
await step("Calendar: remove event pill", async () => {
  await page.getByRole("button", { name: "Remove Office hours" }).click();
  await page.waitForTimeout(100);
});
await step("Calendar: month next/prev", async () => {
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("button", { name: "Previous month" }).click();
});
await step("Calendar: command palette (⌥Space) → close", async () => {
  await page.getByRole("button", { name: "Open command palette" }).click();
  await page.keyboard.press("Escape");
});
await step("Tab: Settings (paint)", async () => {
  await tab("Settings").click();
  await page.getByRole("heading", { name: "Settings" }).waitFor();
});
await step("Settings: theme → paper/forest/contrast/night", async () => {
  for (const t of ["Paper", "Forest", "High contrast", "Night"]) {
    await page.getByRole("radio", { name: t }).check();
  }
});
await step("Settings: reduce motion toggle", async () => {
  await page.getByRole("checkbox", { name: /Reduce motion/ }).check();
  const anim = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--anim-d") || document.documentElement.dataset.motion);
  await page.getByRole("checkbox", { name: /Reduce motion/ }).uncheck();
  return `data-motion=${anim}`;
});
await step("Settings: Check session", async () => {
  await page.getByRole("button", { name: "Check session" }).click();
  await page.getByRole("status").first().waitFor();
});
await step("Settings: Canvas data Inspect", async () => {
  await page.getByRole("button", { name: "Inspect" }).first().click();
});
await step("Settings: View terms & privacy → close", async () => {
  await page.getByRole("button", { name: "View terms & privacy" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
});
await step("Settings: scroll to bottom (background painted?)", async () => {
  await page.evaluate(() => document.getElementById("main")?.scrollTo(0, 1e6));
  const bg = await page.evaluate(() => getComputedStyle(document.getElementById("main")).backgroundColor);
  return `main bg=${bg}`;
});
await step("Tab: Home (paint)", async () => {
  await tab("Home").click();
  await page.getByRole("group", { name: /CSCI 2270/ }).waitFor();
});
await step("Keyboard: tab order on Home", async () => {
  await page.keyboard.press("Tab");
  const seq = [];
  for (let i = 0; i < 8; i++) {
    seq.push(await page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || document.activeElement?.tagName || "").slice(0, 30)));
    await page.keyboard.press("Tab");
  }
  return seq.join(" → ");
});
console.log(JSON.stringify({ results, consoleErrors }, null, 2));
await browser.close();
