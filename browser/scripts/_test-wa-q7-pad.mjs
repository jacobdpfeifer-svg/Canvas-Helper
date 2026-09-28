import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionScore } from "./lib/webassign/scrape.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function readHidden(wa, submitId, idx) {
  return wa.evaluate(
    ({ submitId, idx }) => {
      const box = document.getElementById(submitId)?.closest(".waQBox");
      const fields = [...(box?.querySelectorAll('input[type="hidden"][id^="RA_"]:not([id$="_settings"])') || [])];
      const el = fields[idx];
      return { len: (el?.value || "").length, val: (el?.value || "").slice(0, 200) };
    },
    { submitId, idx }
  );
}

const { browser, wa } = await acquireWebAssignPage({ launchIfNeeded: true });
try {
  const summary = await scrapeAssignmentSummary(wa);
  const q = summary.questions.find((x) => x.number === 7);
  const box = wa.locator(`#${q.submitId}`).locator("xpath=ancestor::div[contains(@class,'waQBox')]");
  const pad = box.locator(".mathtype-wrapper").first();

  await pad.scrollIntoViewIfNeeded();
  await pad.click({ timeout: 8000 });
  await sleep(1000);
  await wa.keyboard.press("Meta+a").catch(() => {});
  await wa.keyboard.press("Backspace").catch(() => {});
  await wa.keyboard.type("2.75", { delay: 50 });
  await wa.keyboard.press("Enter");
  await sleep(800);
  // blur by clicking question header
  await wa.locator(`#${q.submitId}`).click({ force: true });
  await sleep(1000);
  console.log("after enter+blur", await readHidden(wa, q.submitId, 0));
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
