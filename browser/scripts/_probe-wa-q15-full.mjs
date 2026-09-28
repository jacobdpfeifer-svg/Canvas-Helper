import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionDetail } from "./lib/webassign/scrape.mjs";

const { browser, wa } = await acquireWebAssignPage({ launchIfNeeded: true });
try {
  const summary = await scrapeAssignmentSummary(wa);
  const q = summary.questions.find((x) => x.number === 15);
  const detail = await scrapeQuestionDetail(wa, q);
  console.log(detail.maths?.join("\n---\n"));
  console.log("\nTEXT:\n", detail.text.slice(0, 1200));
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
