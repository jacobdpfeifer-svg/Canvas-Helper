import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionDetail } from "./lib/webassign/scrape.mjs";

const WA_URL = "https://www.webassign.net/web/Student/Assignment-Responses/last?dep=39902079";
const { browser, wa } = await acquireWebAssignPage({ waUrl: WA_URL, launchIfNeeded: true });
try {
  if (wa.url().includes("/submit")) {
    await wa.goto(WA_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await wa.waitForTimeout(3000);
  }
  const summary = await scrapeAssignmentSummary(wa);
  const q = summary.questions.find((x) => x.number === 7);
  const detail = await scrapeQuestionDetail(wa, q);
  console.log("maths:", detail.maths);
  console.log("text snippet:", detail.text.slice(0, 800));
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
