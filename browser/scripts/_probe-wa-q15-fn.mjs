import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionDetail } from "./lib/webassign/scrape.mjs";

const { browser, wa } = await acquireWebAssignPage({ launchIfNeeded: true });
try {
  const summary = await scrapeAssignmentSummary(wa);
  const q = summary.questions.find((x) => x.number === 15);
  const detail = await scrapeQuestionDetail(wa, q);
  console.log("Q15 fn:", detail.maths?.find((m) => /f\(x\)/.test(m) || /mi>f/.test(m)) || detail.maths?.[0]);
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
