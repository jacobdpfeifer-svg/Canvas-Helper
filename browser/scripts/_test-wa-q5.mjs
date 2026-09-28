import { launchCanvasContext, requireLoggedIn } from "./lib/canvas-session.mjs";
import { openWebAssignFromCanvas, ensureAssignmentPage } from "./lib/webassign/session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionScore } from "./lib/webassign/scrape.mjs";
import { applyAnswer, submitQuestion } from "./lib/webassign/fill.mjs";

const { context, page } = await launchCanvasContext({ channel: "chrome", headless: false, viewport: { width: 1400, height: 960 } });
try {
  await requireLoggedIn(page);
  const wa = await openWebAssignFromCanvas(page, context, "https://canvas.colorado.edu/courses/141255/assignments/2754105", null);
  await ensureAssignmentPage(wa, /WA\s*8/i, null);
  const summary = await scrapeAssignmentSummary(wa);
  const q = summary.questions.find((x) => x.number === 5);
  const answer = { mathPads: ["3x-9"] };
  const fill = await applyAnswer(wa, q, answer);
  console.log("fill", fill);
  await submitQuestion(wa, q);
  const score = await scrapeQuestionScore(wa, 5);
  console.log("score", score);
} finally {
  await context.close();
}
