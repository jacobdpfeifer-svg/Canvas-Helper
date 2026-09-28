import fs from "node:fs";
import path from "node:path";
import { COURSES_RAW_DIR } from "./lib/canvas-session.mjs";
import {
  acquireWebAssignPage,
  releaseWebAssignBrowser,
} from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionDetail, roughMath } from "./lib/webassign/scrape.mjs";

const ASSIGN = "https://canvas.colorado.edu/courses/141255/assignments/2754105";
const OUT = path.join(COURSES_RAW_DIR, "webassign-wa8-all-text.json");

let browser;
try {
  ({ browser, wa } = await acquireWebAssignPage({
    assignmentUrl: ASSIGN,
    titleRe: /WA\s*8/i,
    log: null,
  }));
  const summary = await scrapeAssignmentSummary(wa);
  const open = summary.questions.filter((q) => !q.complete);
  const details = [];
  for (const q of open) {
    const d = await scrapeQuestionDetail(wa, q);
    details.push({
      number: q.number,
      submitId: q.submitId,
      problemId: q.problemId,
      text: d.text,
      mathsRough: (d.maths || []).map(roughMath),
      textInputs: d.textInputs,
      radioGroups: d.radioGroups,
    });
    console.log("Q", q.number, (d.text || "").slice(0, 120).replace(/\n/g, " "));
  }
  fs.writeFileSync(OUT, JSON.stringify(details, null, 2));
  console.log("Wrote", OUT);
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
