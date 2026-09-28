import { launchCanvasContext, requireLoggedIn } from "./lib/canvas-session.mjs";
import { openWebAssignFromCanvas, ensureAssignmentPage } from "./lib/webassign/session.mjs";
import { scrapeAssignmentSummary } from "./lib/webassign/scrape.mjs";

const ASSIGN = "https://canvas.colorado.edu/courses/141255/assignments/2754105";
const { context, page } = await launchCanvasContext({ channel: "chrome", headless: false, viewport: { width: 1400, height: 960 } });
try {
  await requireLoggedIn(page);
  const wa = await openWebAssignFromCanvas(page, context, ASSIGN, null);
  await ensureAssignmentPage(wa, /WA\s*8/i, null);
  const summary = await scrapeAssignmentSummary(wa);
  for (const q of summary.questions.filter((x) => x.number >= 5 && x.number <= 8)) {
    await wa.locator(`#${q.submitId}`).scrollIntoViewIfNeeded();
    const info = await wa.evaluate(({ submitId, number }) => {
      const btn = document.getElementById(submitId);
      const pads = [...document.querySelectorAll("*")].filter((el) =>
        /Press Space or Enter to edit this math answer/i.test(el.innerText || "")
      );
      const submits = [...document.querySelectorAll('input[type="submit"][id^="submit_"]')];
      const si = submits.findIndex((s) => s.id === submitId);
      const prev = si > 0 ? submits[si - 1] : null;
      const indices = [];
      pads.forEach((pad, idx) => {
        const afterPrev = !prev || !!(pad.compareDocumentPosition(prev) & Node.DOCUMENT_POSITION_FOLLOWING);
        const beforeBtn = !!(pad.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING);
        if (afterPrev && beforeBtn) indices.push(idx);
      });
      return {
        number,
        submitId,
        totalPads: pads.length,
        submitIdx: si,
        indices,
        padSample: pads.slice(0, 3).map((p) => ({
          tag: p.tagName,
          class: p.className,
          childNodes: p.childNodes.length,
        })),
      };
    }, { submitId: q.submitId, number: q.number });
    console.log(JSON.stringify(info, null, 2));
  }
} finally {
  await context.close();
}
