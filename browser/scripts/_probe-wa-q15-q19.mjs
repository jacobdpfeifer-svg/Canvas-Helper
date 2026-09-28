import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionDetail } from "./lib/webassign/scrape.mjs";

const { browser, wa } = await acquireWebAssignPage({ launchIfNeeded: true });
try {
  const summary = await scrapeAssignmentSummary(wa);
  for (const num of [15, 19, 23]) {
    const q = summary.questions.find((x) => x.number === num);
    const detail = await scrapeQuestionDetail(wa, q);
    const stored = await wa.evaluate(({ submitId }) => {
      const box = document.getElementById(submitId)?.closest(".waQBox");
      return [...(box?.querySelectorAll('input[type="hidden"][id^="RA_"]:not([id$="_settings"])') || [])].map(
        (f) => f.value
      );
    }, { submitId: q.submitId });
    console.log(`\nQ${num} fn:`, detail.maths?.[0]);
    console.log("stored:", stored);
    console.log("score:", q.pointsRaw);
  }
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
