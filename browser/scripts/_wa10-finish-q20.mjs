import { launchWebAssignChrome, waitForWebAssignCdp, connectWebAssignBrowser, releaseWebAssignBrowser, readSessionState, writeSessionState, WEBASSIGN_AUTH_DIR } from "./lib/webassign/browser-session.mjs";
import { clearSingletonLocks } from "./lib/canvas-session.mjs";
import { ensureAssignmentPage } from "./lib/webassign/session.mjs";
import { scrapeAssignmentSummary, scrapeQuestionScore, scrapeQuestionDetail } from "./lib/webassign/scrape.mjs";
import { applyAnswer, submitQuestion } from "./lib/webassign/fill.mjs";
import { solveQuestion } from "./lib/webassign/solver.mjs";

async function ensureBrowser() {
  if (!(await waitForWebAssignCdp(3000))) {
    clearSingletonLocks(WEBASSIGN_AUTH_DIR);
    launchWebAssignChrome("https://www.cengage.com/dashboard/home");
    if (!(await waitForWebAssignCdp(90000))) throw new Error("CDP failed");
  }
  return await connectWebAssignBrowser();
}

async function ensureWa10(page) {
  const target = readSessionState().waUrl || "https://www.webassign.net/web/Student/Assignment-Responses/last?dep=39902084";
  if (/39902084/.test(page.url())) return page;
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3000);
  if (/39902084/.test(page.url())) return page;
  await page.goto("https://www.webassign.net/wa-auth/login", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  const inst = page.getByPlaceholder(/school|institution/i).first();
  if (await inst.isVisible().catch(() => false)) {
    await inst.fill("University of Colorado Boulder");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
  }
  const cu = page.getByText(/University of Colorado/i).first();
  if (await cu.isVisible().catch(() => false)) await cu.click();
  await page.waitForTimeout(10000);
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  if (!/39902084/.test(page.url())) {
    await page.goto("https://www.cengage.com/dashboard/home", { waitUntil: "domcontentloaded" });
    const href = await page.locator('a:has-text("OPEN WEBASSIGN")').first().getAttribute("href");
    await page.goto(href, { waitUntil: "domcontentloaded" });
    const wa10 = await page.evaluate(() =>
      [...document.querySelectorAll("a")].find((a) => /WA\s*10/.test(a.textContent || ""))?.href
    );
    if (wa10) await page.goto(wa10, { waitUntil: "domcontentloaded" });
  }
  writeSessionState({ waUrl: page.url(), title: "WA 10" });
  return page;
}

async function scoreQ(wa, q, answer) {
  await ensureAssignmentPage(wa, /WA\s*10/i, null);
  await wa.locator(`#${q.submitId}`).scrollIntoViewIfNeeded();
  await applyAnswer(wa, q, answer);
  await submitQuestion(wa, q);
  await ensureAssignmentPage(wa, /WA\s*10/i, null);
  return await scrapeQuestionScore(wa, q.number);
}

async function coordSelect(wa, q, ids) {
  let best = [0, 0, 1, 3];
  let bestEarned = -1;
  for (let round = 0; round < 6; round++) {
    let improved = false;
    for (let i = 0; i < ids.length; i++) {
      for (let v = 0; v < 4; v++) {
        const trial = [...best];
        trial[i] = v;
        const sc = await scoreQ(wa, q, {
          selects: ids.map((id, j) => ({ id, value: String(trial[j]) })),
          confidence: 1,
        });
        if ((sc?.earned ?? 0) > bestEarned) {
          bestEarned = sc.earned;
          best = trial;
          improved = true;
          console.log("Q20", trial, sc.raw);
        }
        if (sc?.complete) return best;
      }
    }
    if (!improved || bestEarned >= 2) break;
  }
  return best;
}

let browser, page;
try {
  ({ browser, page } = await ensureBrowser());
  page = await ensureWa10(page);
  let summary = await scrapeAssignmentSummary(page);
  console.log("Score", summary.score);

  for (const num of [11, 15]) {
    const q = summary.questions.find((x) => x.number === num);
    if (!q || q.complete) {
      console.log(`Q${num} skip`, q?.pointsRaw);
      continue;
    }
    const detail = await scrapeQuestionDetail(page, q);
    const answer = await solveQuestion({ ...detail, problemId: q.problemId });
    let sc = await scoreQ(page, q, answer);
    console.log(`Q${num}`, JSON.stringify(answer.mathPads), sc?.raw);
    if (!sc?.complete) {
      for (const pad of num === 11 ? ["sqrt(x+1)"] : ["2x^3+3"]) {
        sc = await scoreQ(page, q, { mathPads: [pad], confidence: 1 });
        console.log(` Q${num} mml ${pad}`, sc?.raw);
      }
    }
  }

  summary = await scrapeAssignmentSummary(page);
  const q20 = summary.questions.find((x) => x.number === 20);
  if (q20 && !q20.complete) {
    const detail = await scrapeQuestionDetail(page, q20);
    const best = await coordSelect(page, q20, detail.selects.map((s) => s.id));
    console.log("Q20 best", best);
  }

  const final = await scrapeAssignmentSummary(page);
  for (const q of final.questions.filter((x) => x.number <= 20)) {
    console.log(`Q${q.number}: ${q.complete ? "DONE" : "OPEN"} ${q.pointsRaw}`);
  }
  console.log("Final", final.score);
  await releaseWebAssignBrowser(browser, { close: false });
} catch (e) {
  console.error(e);
  await releaseWebAssignBrowser(browser, { close: false }).catch(() => {});
  process.exit(1);
}
