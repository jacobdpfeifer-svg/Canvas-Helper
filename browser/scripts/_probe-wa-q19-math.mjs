import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionDetail } from "./lib/webassign/scrape.mjs";

const WA_URL = "https://www.webassign.net/web/Student/Assignment-Responses/last?dep=39902079";
const { browser, wa } = await acquireWebAssignPage({ waUrl: WA_URL, launchIfNeeded: true });
try {
  const summary = await scrapeAssignmentSummary(wa);
  for (const num of [19, 23, 11]) {
    const q = summary.questions.find((x) => x.number === num);
    const detail = await scrapeQuestionDetail(wa, q);
    console.log(`\nQ${num} function math:`, detail.maths?.[0]);
    if (num === 11) console.log("text:", detail.text.match(/f\(𝑥\)[\s\S]{0,400}/)?.[0]?.slice(0, 400));
  }
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
