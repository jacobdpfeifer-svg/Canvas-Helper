import fs from "node:fs";
import path from "node:path";
import { launchCanvasContext, requireLoggedIn, COURSES_RAW_DIR } from "./lib/canvas-session.mjs";
import { openWebAssignFromCanvas, ensureAssignmentPage } from "./lib/webassign/session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionDetail, roughMath } from "./lib/webassign/scrape.mjs";

const ASSIGN = "https://canvas.colorado.edu/courses/141255/assignments/2754105";
const { context, page } = await launchCanvasContext({
  channel: "chrome",
  headless: false,
  viewport: { width: 1400, height: 960 },
});
try {
  await requireLoggedIn(page);
  const wa = await openWebAssignFromCanvas(page, context, ASSIGN, null);
  await ensureAssignmentPage(wa, /WA\s*8/i, null);
  const summary = await scrapeAssignmentSummary(wa);
  for (const num of [7, 10, 13, 14, 19, 26]) {
    const q = summary.questions.find((x) => x.number === num);
    const d = await scrapeQuestionDetail(wa, q);
    const out = {
      number: num,
      text: d.text,
      mathsRough: (d.maths || []).map(roughMath),
      mathPadCount: d.mathPadCount,
      textInputs: d.textInputs,
      radioGroups: d.radioGroups,
    };
    console.log(JSON.stringify(out, null, 2));
    fs.writeFileSync(path.join(COURSES_RAW_DIR, `wa8-q${num}-text.json`), JSON.stringify(out, null, 2));
  }
} finally {
  await context.close();
}
