import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionDetail } from "./lib/webassign/scrape.mjs";

const { browser, wa } = await acquireWebAssignPage({ launchIfNeeded: true });
try {
  const summary = await scrapeAssignmentSummary(wa);
  for (const num of [8, 9, 15, 19, 20, 23, 24, 25]) {
    const q = summary.questions.find((x) => x.number === num);
    const stored = await wa.evaluate(({ submitId }) => {
      const box = document.getElementById(submitId)?.closest(".waQBox");
      return [...(box?.querySelectorAll('input[type="hidden"][id^="RA_"]:not([id$="_settings"])') || [])].map(
        (f) => f.value
      );
    }, { submitId: q.submitId });
    console.log(`\nQ${num} [${q.pointsRaw}]`);
    stored.forEach((v, i) => console.log(` pad${i}:`, v.slice(0, 180)));
  }
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
