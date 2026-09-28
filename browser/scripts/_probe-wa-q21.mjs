import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary } from "./lib/webassign/scrape.mjs";

const { browser, wa } = await acquireWebAssignPage({ launchIfNeeded: true });
try {
  const summary = await scrapeAssignmentSummary(wa);
  for (const num of [21, 19, 23]) {
    const q = summary.questions.find((x) => x.number === num);
    if (!q) continue;
    await wa.locator(`#${q.submitId}`).scrollIntoViewIfNeeded();
    const val = await wa.evaluate(({ submitId }) => {
      const box = document.getElementById(submitId)?.closest(".waQBox");
      const el = box?.querySelector('input[type="hidden"][id^="RA_"]:not([id$="_settings"])');
      return el?.value || "";
    }, { submitId: q.submitId });
    console.log(`Q${num} MathML:\n`, val);
  }
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
