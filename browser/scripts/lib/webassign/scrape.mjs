/**
 * Scrape WebAssign assignment inventory and per-question details.
 */

export function roughMath(mml) {
  return String(mml || "")
    .replace(/<\/?math[^>]*>/g, "")
    .replace(/<msqrt>/g, "sqrt(")
    .replace(/<\/msqrt>/g, ")")
    .replace(/<mfrac>/g, "(")
    .replace(/<\/mfrac>/g, ")/")
    .replace(/<mi>|<mn>|<mo>|<mrow>/g, "")
    .replace(/<\/mi>|<\/mn>|<\/mo>|<\/mrow>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&minus;/g, "-")
    .replace(/&InvisibleTimes;|&it;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function scrapeAssignmentSummary(wa) {
  return wa.evaluate(() => {
    const body = document.body?.innerText || "";
    const scoreM = body.match(/Current Score:[\s\S]{0,80}?([\d.]+)\s*\/\s*([\d.]+)/i);
    const title =
      document.querySelector("h1, .assignmentTitle")?.innerText?.trim() ||
      document.title ||
      "";

    const questions = [];
    const submitBtns = [...document.querySelectorAll('input[type="submit"][id^="submit_"]')];
    for (const btn of submitBtns) {
      const m = btn.id.match(/^submit_(\d+)_(\d+)$/);
      if (!m) continue;
      const qNum = Number(m[2]) + 1;
      let root = btn;
      for (let i = 0; i < 20 && root; i++) {
        root = root.parentElement;
        if (!root) break;
        const t = root.innerText || "";
        if (new RegExp(`^${qNum}\\.`).test(t.trim()) || t.includes(`${qNum}.\n[`)) break;
      }
      if (!root) root = btn.closest("div") || btn.parentElement;

      const block = (root?.innerText || "").slice(0, 6000);
      const ptsM = block.match(/^\s*\[([^\]]+)\]/m) || block.match(new RegExp(`${qNum}\\.\\s*\\[([^\\]]+)\\]`));
      const ptsRaw = ptsM ? ptsM[1] : "";
      const earnedM = ptsRaw.match(/([\d.]+|[–-])\s*\/\s*([\d.]+)/);
      const earned =
        earnedM && earnedM[1] !== "–" && earnedM[1] !== "-" ? Number(earnedM[1]) : 0;
      const max = earnedM ? Number(earnedM[2]) : 0;
      const complete = max > 0 && earned >= max;

      const probM = block.match(/(?:sprecalc|SPreCalc|SwokPreCalc)[^\n]*/i);
      questions.push({
        number: qNum,
        submitId: btn.id,
        questionId: m[1],
        pointsRaw: ptsRaw,
        earned,
        max,
        complete,
        problemId: probM ? probM[0].trim() : null,
      });
    }

    questions.sort((a, b) => a.number - b.number);
    return {
      title,
      url: location.href,
      score: scoreM ? { earned: Number(scoreM[1]), max: Number(scoreM[2]) } : null,
      questions,
    };
  });
}

export async function scrapeQuestionDetail(wa, question) {
  await wa.locator(`#${question.submitId}`).scrollIntoViewIfNeeded().catch(() => {});
  await wa.waitForTimeout(1500);
  if (typeof wa.waitForFunction === "function") {
    await wa
      .waitForFunction(
        () => typeof window.MathJax !== "undefined" || document.querySelectorAll("math").length > 0,
        { timeout: 8000 }
      )
      .catch(() => {});
  }
  await wa.waitForTimeout(1000);

  return wa.evaluate(
    ({ submitId, number }) => {
      const btn = document.getElementById(submitId);
      if (!btn) return { error: "submit not found", submitId };

      let root = btn;
      for (let i = 0; i < 20 && root; i++) {
        root = root.parentElement;
        if (!root) break;
        const t = root.innerText || "";
        if (new RegExp(`^${number}\\.`).test(t.trim()) || t.includes(`${number}.\n[`)) break;
      }
      if (!root) root = btn.closest("div") || document.body;

      const text = (root.innerText || "").slice(0, 8000);
      const maths = [...root.querySelectorAll("math")].map((m) => m.outerHTML);

      const padEls = [...root.querySelectorAll(".wirisanswer, .wiris, .mathAnswer, span")]
        .filter((el) => el.innerText?.trim() === "Press Space or Enter to edit this math answer");
      const mathPads = padEls.length;

      const selects = [...root.querySelectorAll("select")]
        .filter((el) => {
          try {
            return el.getClientRects().length > 0;
          } catch {
            return false;
          }
        })
        .map((el) => ({
          id: el.id,
          name: el.name,
          options: [...el.options].map((o) => ({ value: o.value, label: o.text.trim() })),
          current: el.value,
        }));

      const textInputs = [...root.querySelectorAll('input[type="text"]')]
        .filter((el) => {
          try {
            return el.getClientRects().length > 0 && !el.className.includes("wrs_");
          } catch {
            return false;
          }
        })
        .map((el) => ({ id: el.id, name: el.name, value: el.value }));

      const radios = [...root.querySelectorAll('input[type="radio"]')];
      const radioGroups = {};
      for (const r of radios) {
        if (!r.name) continue;
        if (!radioGroups[r.name]) {
          radioGroups[r.name] = { name: r.name, options: [] };
        }
        const label =
          r.labels?.[0]?.innerText?.trim() ||
          r.parentElement?.innerText?.trim()?.slice(0, 80) ||
          `value=${r.value}`;
        radioGroups[r.name].options.push({ value: r.value, label, id: r.id });
      }

      const hasGraph = /Graph the solution set|Use the tools to enter/i.test(text);
      const html = (root?.innerHTML || "").slice(0, 12000);
      const images = [...root.querySelectorAll("img")].map((img) => ({
        alt: img.alt || "",
        src: (img.src || "").slice(0, 200),
      }));

      return {
        number,
        submitId,
        text,
        html,
        images,
        maths,
        mathPadCount: mathPads,
        selects,
        textInputs,
        radioGroups: Object.values(radioGroups),
        hasGraph,
      };
    },
    { submitId: question.submitId, number: question.number }
  );
}

export async function scrapeQuestionScore(wa, number) {
  return wa.evaluate((qNum) => {
    const body = document.body.innerText || "";
    const re = new RegExp(`${qNum}\\.\\s*\\[([^\\]]+)\\]`, "m");
    const m = body.match(re);
    if (!m) return null;
    const pts = m[1];
    const earnedM = pts.match(/([\d.]+|-)\s*\/\s*([\d.]+)/);
    if (!earnedM) return { raw: pts };
    const earned = earnedM[1] === "–" || earnedM[1] === "-" ? 0 : Number(earnedM[1]);
    const max = Number(earnedM[2]);
    return { raw: pts, earned, max, complete: max > 0 && earned >= max };
  }, number);
}
