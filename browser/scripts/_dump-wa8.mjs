/** Dump WA8 open question details for agent solving. */
import fs from "node:fs";
import path from "node:path";
import { launchCanvasContext, requireLoggedIn, COURSES_RAW_DIR } from "./lib/canvas-session.mjs";
import { openWebAssignFromCanvas, ensureAssignmentPage } from "./lib/webassign/session.mjs";
import {
  scrapeAssignmentSummary,
  scrapeQuestionDetail,
  roughMath,
} from "./lib/webassign/scrape.mjs";

const ASSIGN = "https://canvas.colorado.edu/courses/141255/assignments/2754105";
const OUT = path.join(COURSES_RAW_DIR, "webassign-wa8-questions-dump.json");

const { context, page } = await launchCanvasContext({
  channel: "chrome",
  headless: false,
  viewport: { width: 1400, height: 960 },
  args: ["--disable-blink-features=AutomationControlled"],
});

try {
  await requireLoggedIn(page);
  const wa = await openWebAssignFromCanvas(page, context, ASSIGN, null);
  await ensureAssignmentPage(wa, /WA\s*8/i, null);
  const summary = await scrapeAssignmentSummary(wa);
  const open = summary.questions.filter((q) => !q.complete);
  const details = [];
  for (const q of open) {
    await wa.locator(`#${q.submitId}`).scrollIntoViewIfNeeded().catch(() => {});
    const d = await scrapeQuestionDetail(wa, q);
    details.push({
      number: q.number,
      submitId: q.submitId,
      problemId: q.problemId,
      pointsRaw: q.pointsRaw,
      text: d.text,
      html: d.html,
      images: d.images,
      mathsRough: (d.maths || []).map(roughMath),
      mathPadCount: d.mathPadCount,
      selects: d.selects,
      textInputs: d.textInputs,
      radioGroups: d.radioGroups,
      hasGraph: d.hasGraph,
    });
    console.log("dumped Q", q.number);
  }
  fs.mkdirSync(COURSES_RAW_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ summary, details }, null, 2));
  console.log("Wrote", OUT, details.length, "questions");
} finally {
  await context.close();
}
