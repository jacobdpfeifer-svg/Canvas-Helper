import { launchCanvasContext, requireLoggedIn } from "./lib/canvas-session.mjs";
import { openWebAssignFromCanvas, ensureAssignmentPage } from "./lib/webassign/session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionScore } from "./lib/webassign/scrape.mjs";
import { applyAnswer, submitQuestion } from "./lib/webassign/fill.mjs";

const tries = ["(x^2+8)^(1/2)", "sqrt(x^2+8)"];
const { context, page } = await launchCanvasContext({ channel: "chrome", headless: false, viewport: { width: 1400, height: 960 } });
try {
  await requireLoggedIn(page);
  const wa = await openWebAssignFromCanvas(page, context, "https://canvas.colorado.edu/courses/141255/assignments/2754105", null);
  await ensureAssignmentPage(wa, /WA\s*8/i, null);
  const summary = await scrapeAssignmentSummary(wa);
  const q = summary.questions.find((x) => x.number === 6);
  for (const val of tries) {
    const fill = await applyAnswer(wa, q, { mathPads: [val] });
    console.log("try", val, fill);
    await submitQuestion(wa, q);
    await wa.waitForTimeout(3000);
    console.log("score", await scrapeQuestionScore(wa, 6));
  }
} finally {
  await context.close();
}
