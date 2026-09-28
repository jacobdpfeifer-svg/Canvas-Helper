import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionScore } from "./lib/webassign/scrape.mjs";
import { submitQuestion } from "./lib/webassign/fill.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const { browser, wa } = await acquireWebAssignPage({ launchIfNeeded: true });
try {
  const summary = await scrapeAssignmentSummary(wa);
  const q = summary.questions.find((x) => x.number === 19);
  const box = wa.locator(`#${q.submitId}`).locator("xpath=ancestor::div[contains(@class,'waQBox')]");
  const pad = box.locator(".mathtype-wrapper").first();
  const val = "(-infinity,-7)U(-7,infinity)";
  await pad.scrollIntoViewIfNeeded();
  await pad.click();
  await sleep(900);
  await wa.keyboard.press("Meta+a").catch(() => {});
  await wa.keyboard.press("Backspace").catch(() => {});
  await wa.keyboard.type(val, { delay: 35 });
  await wa.keyboard.press("Enter");
  await sleep(500);
  await wa.locator(`#${q.submitId}`).click({ force: true });
  await sleep(800);
  await submitQuestion(wa, q);
  console.log("score", await scrapeQuestionScore(wa, 19));
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
