import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary } from "./lib/webassign/scrape.mjs";

const WA_URL = "https://www.webassign.net/web/Student/Assignment-Responses/last?dep=39902079";
const { browser, wa } = await acquireWebAssignPage({ waUrl: WA_URL, launchIfNeeded: true });
try {
  if (!wa.url().includes("Assignment-Responses/last")) {
    await wa.goto(WA_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await wa.waitForTimeout(3000);
  }
  const summary = await scrapeAssignmentSummary(wa);
  const q = summary.questions.find((x) => x.number === 7);
  await wa.locator(`#${q.submitId}`).scrollIntoViewIfNeeded();
  const info = await wa.evaluate(({ submitId }) => {
    const box = document.getElementById(submitId)?.closest(".waQBox");
    const fields = [...(box?.querySelectorAll('input[type="hidden"][id^="RA_"]:not([id$="_settings"])') || [])];
    return {
      score: box?.innerText?.match(/\[[^\]]+\]/)?.[0],
      fields: fields.map((f) => f.value),
    };
  }, { submitId: q.submitId });
  console.log(JSON.stringify(info, null, 2));
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
