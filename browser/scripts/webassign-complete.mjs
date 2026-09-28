/**
 * Full-auto WebAssign completer (persistent CDP session).
 *
 * Usage:
 *   cd browser && npm run open-webassign          # once — leave Chrome open
 *   cd browser && npm run webassign -- --list
 *   cd browser && npm run webassign -- --all-open
 *
 * Subsequent runs reuse the open WebAssign tab (no Canvas SSO round-trip).
 * Optional: OPENAI_API_KEY for stronger math answers.
 */
import fs from "node:fs";
import path from "node:path";
import { COURSES_DIR } from "./lib/canvas-session.mjs";
import {
  acquireWebAssignPage,
  readSessionState,
  releaseWebAssignBrowser,
} from "./lib/webassign/browser-session.mjs";
import { ensureAssignmentPage } from "./lib/webassign/session.mjs";
import { applyAnswer, submitQuestion } from "./lib/webassign/fill.mjs";
import {
  scrapeAssignmentSummary,
  scrapeQuestionDetail,
  scrapeQuestionScore,
  roughMath,
} from "./lib/webassign/scrape.mjs";
import { solveQuestion } from "./lib/webassign/solver.mjs";
import { createSessionLog } from "./lib/webassign/session-log.mjs";

const DEFAULT_ASSIGNMENT =
  "https://canvas.colorado.edu/courses/141255/assignments/2754105";
const DEFAULT_WA_URL =
  readSessionState().waUrl ||
  "https://www.webassign.net/web/Student/Assignment-Responses/last?dep=39902079";

function parseArgs(argv) {
  const out = {
    assignment: DEFAULT_ASSIGNMENT,
    waUrl: DEFAULT_WA_URL,
    allOpen: false,
    list: false,
    limit: Infinity,
    through: Infinity,
    titleRe: /WA\s*10/i,
    close: false,
    launchIfNeeded: process.env.WEBASSIGN_NO_LAUNCH !== "1",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--assignment") out.assignment = argv[++i];
    else if (a === "--wa-url") out.waUrl = argv[++i];
    else if (a === "--all-open") out.allOpen = true;
    else if (a === "--list") out.list = true;
    else if (a === "--limit") out.limit = Number(argv[++i] || 1);
    else if (a === "--through") out.through = Number(argv[++i] || 10);
    else if (a === "--title") out.titleRe = new RegExp(argv[++i], "i");
    else if (a === "--no-launch") out.launchIfNeeded = false;
    else if (a === "--close") out.close = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function appendCourseNote(line) {
  const file = path.join(COURSES_DIR, "APPM1235.md");
  if (!fs.existsSync(file)) return;
  const stamp = new Date().toISOString().slice(0, 10);
  const note = `\n- **${stamp}** — ${line}\n`;
  let text = fs.readFileSync(file, "utf8");
  if (/## Class notes/.test(text)) {
    text = text.replace(/## Class notes\n/, `## Class notes\n${note}`);
  } else {
    text += `\n## Class notes\n${note}`;
  }
  fs.writeFileSync(file, text);
}

function usage() {
  console.log(`WebAssign full-auto completer (persistent session)

  npm run open-webassign     Start Chrome once; leave it open between runs

  --assignment URL   Canvas assignment URL (default: WA8)
  --wa-url URL       Direct WebAssign assignment URL (skips Canvas)
  --all-open         Attempt all incomplete questions
  --list             Print question inventory only
  --limit N          Max questions to attempt
  --through N        Only attempt questions with number <= N (default: all)
  --title REGEX      Expected assignment title (default: WA 10)
  --no-launch        Fail if CDP session missing (do not spawn Chrome)
  --close            Close Chrome when done (default: keep session open)
`);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  usage();
  process.exit(0);
}

function sessionLogSlug(titleRe) {
  const s = titleRe.source || "";
  if (/WA\s*10|2\.6/.test(s)) return "wa10";
  if (/WA\s*9|2\.3/.test(s)) return "wa9";
  if (/WA\s*8|2\.1/.test(s)) return "wa8";
  return "run";
}
const log = createSessionLog(sessionLogSlug(opts.titleRe));
log.event("start", { assignment: opts.assignment, list: opts.list, waUrl: opts.waUrl });

let browser;
let wa;
try {
  const acquired = await acquireWebAssignPage({
    assignmentUrl: opts.assignment,
    waUrl: opts.waUrl,
    titleRe: opts.titleRe,
    log,
    launchIfNeeded: opts.launchIfNeeded,
  });
  browser = acquired.browser;
  wa = acquired.wa;
  const title = acquired.meta?.title || "";

  if (title && !opts.titleRe.test(title)) {
    console.warn(`Warning: title "${title}" does not match ${opts.titleRe}`);
  }

  const summary = await scrapeAssignmentSummary(wa);
  log.event("inventory", summary);
  console.log("\n=== Assignment:", summary.title || title);
  console.log("Score:", summary.score);
  console.log("Questions:", summary.questions.length);
  for (const q of summary.questions) {
    console.log(
      ` Q${q.number}: ${q.complete ? "DONE" : "OPEN"} [${q.pointsRaw}] ${q.problemId || ""}`
    );
  }

  if (opts.list) {
    log.finish({ status: "list", summary });
    await releaseWebAssignBrowser(browser, { close: opts.close });
    process.exit(0);
  }

  const todo = summary.questions.filter((q) => !q.complete || opts.allOpen);
  const batch = todo
    .filter((q) => !q.complete && q.number <= opts.through)
    .slice(0, opts.limit);
  console.log(`\nAttempting ${batch.length} incomplete question(s)…`);

  const results = [];

  for (const q of batch) {
    console.log(`\n--- Q${q.number} ---`);
    log.event("question_start", { number: q.number, submitId: q.submitId });

    await wa.locator(`#${q.submitId}`).scrollIntoViewIfNeeded().catch(() => {});
    const detail = await scrapeQuestionDetail(wa, q);
    detail.mathsRough = (detail.maths || []).map(roughMath);
    detail.problemId = q.problemId;
    detail.textInputs = detail.textInputs?.length ? detail.textInputs : [];

    const answer = await solveQuestion(detail);
    console.log("Solver:", answer.source, answer.rationale || "");
    console.log("Answer:", JSON.stringify(answer, null, 2).slice(0, 800));

    if (
      (answer.confidence ?? 0) <= 0 &&
      !answer.mathPads?.length &&
      !answer.selects?.length &&
      !answer.radios?.length &&
      !answer.radio &&
      !answer.graph
    ) {
      log.question({
        number: q.number,
        status: "skipped_unsolved",
        detail: { text: detail.text?.slice(0, 500), mathsRough: detail.mathsRough },
      });
      results.push({ number: q.number, status: "skipped_unsolved" });
      continue;
    }

    await ensureAssignmentPage(wa, opts.titleRe, log);

    const fillResult = await applyAnswer(wa, q, answer);
    await submitQuestion(wa, q);
    await ensureAssignmentPage(wa, opts.titleRe, log);

    let score;
    try {
      score = await scrapeQuestionScore(wa, q.number);
    } catch (err) {
      if (/closed|detached|target/i.test(String(err.message || err))) {
        throw new Error(
          "WebAssign browser tab closed — leave Chrome open and run: npm run open-webassign"
        );
      }
      throw err;
    }
    let status = score?.complete ? "correct" : "submitted";

    if (score && !score.complete && score.max > 0) {
      console.log(`Q${q.number} retry — earned ${score.earned}/${score.max}`);
      const retry = await solveQuestion({ ...detail, retry: true, priorScore: score });
      if ((retry.confidence ?? 0) > (answer.confidence ?? 0)) {
        await applyAnswer(wa, q, retry);
        await submitQuestion(wa, q);
        score = await scrapeQuestionScore(wa, q.number);
        status = score?.complete ? "correct_retry" : "wrong_retry";
      } else {
        status = "wrong";
      }
    }

    const entry = {
      number: q.number,
      status,
      score,
      answer,
      fillResult,
      problemId: q.problemId,
    };
    log.question(entry);
    results.push(entry);
    console.log(`Q${q.number} → ${status}`, score?.raw || "");
  }

  const finalSummary = await scrapeAssignmentSummary(wa);
  log.finish({
    status: "complete",
    finalScore: finalSummary.score,
    results,
    url: finalSummary.url,
  });

  console.log("\n=== Final score:", finalSummary.score);
  console.log("Log:", log.file);
  if (!opts.close) {
    console.log("Chrome left open — next npm run webassign reuses this WebAssign session.");
  }

  const earned = finalSummary.score?.earned ?? "?";
  const max = finalSummary.score?.max ?? "?";
  appendCourseNote(
    `WebAssign auto-run: ${finalSummary.title || title} — score ${earned}/${max} — log ${path.basename(log.file)}`
  );

  await releaseWebAssignBrowser(browser, { close: opts.close });
  const failed = results.some((r) => r.status === "wrong" || r.status === "skipped_unsolved");
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error(e);
  log.finish({ status: "error", error: String(e.message || e), stack: e.stack });
  await releaseWebAssignBrowser(browser, { close: opts.close }).catch(() => {});
  process.exit(1);
}
