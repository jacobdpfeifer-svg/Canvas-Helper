/**
 * Probe MathType pad state for WA8 Q6/Q7 — hidden fields + toolbar buttons.
 */
import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary } from "./lib/webassign/scrape.mjs";

const { browser, wa } = await acquireWebAssignPage({ launchIfNeeded: true });
try {
  const summary = await scrapeAssignmentSummary(wa);
  for (const num of [6, 7, 19]) {
    const q = summary.questions.find((x) => x.number === num);
    if (!q) continue;
    await wa.locator(`#${q.submitId}`).scrollIntoViewIfNeeded();
    const info = await wa.evaluate(({ submitId }) => {
      const btn = document.getElementById(submitId);
      const box = btn?.closest(".waQBox");
      const pads = [...(box?.querySelectorAll(".mathtype-wrapper") || [])];
      const hiddens = [...(box?.querySelectorAll('input[type="hidden"][id^="RA_"]') || [])].map(
        (el) => ({
          id: el.id,
          enabled: box?.querySelector(`#enabled_${el.id}`)?.value,
          valueLen: (el.value || "").length,
          valueStart: (el.value || "").slice(0, 120),
        })
      );
      const toolbarBtns = [...document.querySelectorAll(".wrs_toolbar button, .wrs_toolbar img")].map(
        (el) => ({
          title: el.title || el.alt || "",
          class: String(el.className).slice(0, 60),
        })
      );
      return { submitId, padCount: pads.length, hiddens, toolbarBtns: toolbarBtns.slice(0, 20) };
    }, { submitId: q.submitId });
    console.log(`\nQ${num}:`, JSON.stringify(info, null, 2));
  }
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
