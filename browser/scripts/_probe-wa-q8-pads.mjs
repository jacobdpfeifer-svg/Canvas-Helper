import { acquireWebAssignPage, releaseWebAssignBrowser } from "./lib/webassign/browser-session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionDetail } from "./lib/webassign/scrape.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const { browser, wa } = await acquireWebAssignPage({ launchIfNeeded: true });
try {
  const summary = await scrapeAssignmentSummary(wa);
  const q = summary.questions.find((x) => x.number === 8);
  const detail = await scrapeQuestionDetail(wa, q);
  console.log("Q8 fn:", detail.maths?.[0]);
  await wa.locator(`#${q.submitId}`).scrollIntoViewIfNeeded();
  const pre = await wa.evaluate(({ submitId }) => {
    const box = document.getElementById(submitId)?.closest(".waQBox");
    return {
      pads: box?.querySelectorAll(".mathtype-wrapper")?.length,
      hiddens: [...(box?.querySelectorAll('input[type="hidden"][id^="RA_"]:not([id$="_settings"])') || [])].map(
        (f) => f.value.length
      ),
    };
  }, { submitId: q.submitId });
  console.log("pre", pre);

  const box = wa.locator(`#${q.submitId}`).locator("xpath=ancestor::div[contains(@class,'waQBox')]");
  const pad = box.locator(".mathtype-wrapper").first();
  await pad.click();
  await sleep(1000);
  await wa.keyboard.press("Meta+a").catch(() => {});
  await wa.keyboard.type("-5", { delay: 50 });
  await wa.keyboard.press("Enter");
  await sleep(500);
  await wa.locator(`#${q.submitId}`).click({ force: true });
  await sleep(1000);
  const post = await wa.evaluate(({ submitId }) => {
    const box = document.getElementById(submitId)?.closest(".waQBox");
    const f = box?.querySelector('input[type="hidden"][id^="RA_"]:not([id$="_settings"])');
    return { len: f?.value?.length, val: f?.value?.slice(0, 150) };
  }, { submitId: q.submitId });
  console.log("post", post);
} finally {
  await releaseWebAssignBrowser(browser, { close: false });
}
