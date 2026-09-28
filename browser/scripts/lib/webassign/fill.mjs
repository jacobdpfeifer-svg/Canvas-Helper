/**
 * Fill WebAssign answer fields and submit per question.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const INFINITY_MML =
  "<mi>i</mi><mi>n</mi><mi>f</mi><mi>i</mi><mi>n</mi><mi>i</mi><mi>t</mi><mi>y</mi>";

function tokenToMathML(token) {
  const t = String(token ?? "").trim();
  if (!t) return "";
  if (/^undefined$/i.test(t)) {
    return "<mtext>undefined</mtext>";
  }
  if (/^-?infinity$/i.test(t) || /^-?inf$/i.test(t)) {
    return t.startsWith("-") ? `<mo>-</mo>${INFINITY_MML}` : INFINITY_MML;
  }
  if (/^-?\d+\/\d+$/.test(t)) {
    const [n, d] = t.slice(t.startsWith("-") ? 1 : 0).split("/");
    const body = `<mfrac><mn>${n}</mn><mn>${d}</mn></mfrac>`;
    return t.startsWith("-") ? `<mo>-</mo>${body}` : body;
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    return t.startsWith("-") ? `<mo>-</mo><mn>${t.slice(1)}</mn>` : `<mn>${t}</mn>`;
  }
  // algebraic — split on operators loosely
  return `<mrow>${t
    .replace(/([+\-*/^()])/g, "<mo>$1</mo>")
    .replace(/([a-zA-Z]+|\d+)/g, "<mi>$1</mi>")}</mrow>`;
}

function intervalToMathML(open, left, right, close) {
  return `<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced open="${open}" close="${close}"><mrow>${tokenToMathML(left)}<mo>,</mo>${tokenToMathML(right)}</mrow></mfenced></math>`;
}

const EXACT_MML = {
  "0": '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>0</mn></math>',
  "-1": '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1</mn></math>',
  undefined:
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mtext>undefined</mtext></math>',
  "(a^2-6a)":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>-</mo><mn>6</mn><mi>a</mi></mrow></math>',
  "((a+h)^2-6(a+h))":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msup><mrow><mi>a</mi><mo>+</mo><mi>h</mi></mrow><mn>2</mn></msup><mo>-</mo><mn>6</mn><mrow><mo>(</mo><mi>a</mi><mo>+</mo><mi>h</mi><mo>)</mo></mrow></mrow></math>',
  "a^2-6a":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>-</mo><mn>6</mn><mi>a</mi></mrow></math>',
  "a^2+2ah+h^2-6a-6h":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><mn>2</mn><mi>a</mi><mi>h</mi><mo>+</mo><msup><mi>h</mi><mn>2</mn></msup><mo>-</mo><mn>6</mn><mi>a</mi><mo>-</mo><mn>6</mn><mi>h</mi></mrow></math>',
  "2a-6+h":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>2</mn><mi>a</mi><mo>-</mo><mn>6</mn><mo>+</mo><mi>h</mi></mrow></math>',
  "2a+h-6":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>2</mn><mi>a</mi><mo>+</mo><mi>h</mi><mo>-</mo><mn>6</mn></mrow></math>',
  "(a+8)/(a-8)":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>a</mi><mo>+</mo><mn>8</mn></mrow><mrow><mi>a</mi><mo>-</mo><mn>8</mn></mrow></mfrac></math>',
  "a^2/(a^2-16)":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><msup><mi>a</mi><mn>2</mn></msup><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>-</mo><mn>16</mn></mrow></mfrac></math>',
  "(a+9)/(a-7)":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>a</mi><mo>+</mo><mn>9</mn></mrow><mrow><mi>a</mi><mo>-</mo><mn>7</mn></mrow></mfrac></math>',
  "4x+1/x":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>4</mn><mi>x</mi><mo>+</mo><mfrac><mn>1</mn><mi>x</mi></mfrac></mrow></math>',
  "(-infinity,infinity)":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced open="(" close=")"><mrow><mrow><mo>-</mo><mi>infinity</mi></mrow><mo>,</mo><mi>infinity</mi></mrow></mfenced></math>',
  "(2,infinity)":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced open="(" close=")"><mrow><mn>2</mn><mo>,</mo><mi>infinity</mi></mrow></mfenced></math>',
  "[-4,3]":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced open="[" close="]"><mrow><mo>-</mo><mn>4</mn><mo>,</mo><mn>3</mn></mrow></mfenced></math>',
  "[1/2,5]":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced open="[" close="]"><mrow><mfrac><mn>1</mn><mn>2</mn></mfrac><mo>,</mo><mn>5</mn></mrow></mfenced></math>',
  "(-3,-1)U(0,2)":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfenced open="(" close=")"><mrow><mo>-</mo><mn>3</mn><mo>,</mo><mo>-</mo><mn>1</mn></mrow></mfenced><mo>U</mo><mfenced open="(" close=")"><mrow><mn>0</mn><mo>,</mo><mn>2</mn></mrow></mfenced></mrow></math>',
  "[-1,3]":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced open="[" close="]"><mrow><mo>-</mo><mn>1</mn><mo>,</mo><mn>3</mn></mrow></mfenced></math>',
  "(-1,0)":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced open="(" close=")"><mrow><mo>-</mo><mn>1</mn><mo>,</mo><mn>0</mn></mrow></mfenced></math>',
  "sqrt(x+1)":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><msqrt><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></msqrt></math>',
  "2x^3+3":
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>2</mn><msup><mi>x</mi><mn>3</mn></msup><mo>+</mo><mn>3</mn></mrow></math>',
};

function answerToMathML(val) {
  const v = String(val ?? "").trim();
  if (!v) return null;

  if (EXACT_MML[v]) return EXACT_MML[v];

  if (v === "sqrt(x^2+8)") {
    return '<math xmlns="http://www.w3.org/1998/Math/MathML"><msqrt><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>8</mn></mrow></msqrt></math>';
  }

  const sqrtM = v.match(/^sqrt\((.+)\)$/i);
  if (sqrtM) {
    const inner = sqrtM[1];
    return `<math xmlns="http://www.w3.org/1998/Math/MathML"><msqrt><mrow>${tokenToMathML(inner)}</mrow></msqrt></math>`;
  }

  const parts = v.split(/U|∪/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    const chunks = parts.map((part) => {
      const m = part.match(/^([\[\(])([^,]+),([^,\]\)]+)([\]\)])$/);
      if (!m) return null;
      const inner = intervalToMathML(m[1], m[2], m[3], m[4]);
      const body = inner.replace(/^<math[^>]*>/, "").replace(/<\/math>$/, "");
      return body;
    });
    if (chunks.every(Boolean)) {
      return `<math xmlns="http://www.w3.org/1998/Math/MathML">${chunks.join("<mo>U</mo>")}</math>`;
    }
  }

  const intervalM = v.match(/^([\[\(])([^,]+),([^,\]\)]+)([\]\)])$/);
  if (intervalM) {
    return intervalToMathML(intervalM[1], intervalM[2], intervalM[3], intervalM[4]);
  }

  return null;
}

function hiddenFieldsSelector() {
  return 'input[type="hidden"][id^="RA_"]:not([id$="_settings"])';
}

async function hiddenFieldLen(wa, question, padIndex) {
  return wa.evaluate(
    ({ submitId, padIndex, sel }) => {
      const box = document.getElementById(submitId)?.closest(".waQBox");
      const fields = [...(box?.querySelectorAll(sel) || [])];
      return (fields[padIndex]?.value || "").length;
    },
    { submitId: question.submitId, padIndex, sel: hiddenFieldsSelector() }
  );
}

async function injectMathML(wa, question, padIndex, mml) {
  const ok = await wa.evaluate(
    ({ submitId, padIndex, mml, sel }) => {
      const box = document.getElementById(submitId)?.closest(".waQBox");
      if (!box) return false;
      const fields = [...box.querySelectorAll(sel)];
      const field = fields[padIndex];
      if (!field) return false;
      field.value = mml;
      const enabled = box.querySelector(`#enabled_${field.id}`);
      if (enabled) enabled.value = "1";
      return true;
    },
    { submitId: question.submitId, padIndex, mml, sel: hiddenFieldsSelector() }
  );
  return ok;
}

async function commitMathPad(wa, question) {
  await wa.keyboard.press("Enter").catch(() => {});
  await sleep(500);
  const btn = wa.locator(`#${question.submitId}`);
  await btn.click({ force: true, position: { x: 8, y: 8 } }).catch(() => {});
  await sleep(700);
}

async function waitForHidden(wa, question, padIndex, minLen = 10, timeout = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if ((await hiddenFieldLen(wa, question, padIndex)) >= minLen) return true;
    await sleep(250);
  }
  return false;
}

export async function fillMathPadsInQuestion(wa, question, values) {
  const count = await wa.evaluate(({ submitId }) => {
    const btn = document.getElementById(submitId);
    const box = btn?.closest(".waQBox");
    return box ? box.querySelectorAll(".mathtype-wrapper").length : 0;
  }, { submitId: question.submitId });

  if (!count) return 0;

  const box = wa.locator(`#${question.submitId}`).locator("xpath=ancestor::div[contains(@class,'waQBox')]");
  const pads = box.locator(".mathtype-wrapper");
  let filled = 0;

  for (let i = 0; i < Math.min(values.length, count); i++) {
    const val = String(values[i] ?? "");
    if (!val) continue;

    const mml = answerToMathML(val);
    const preferKeyboard = /infinity|[U∪]/i.test(val) && !EXACT_MML[val];
    if (mml && !preferKeyboard && (await injectMathML(wa, question, i, mml))) {
      if (await waitForHidden(wa, question, i, 8, 3000)) {
        filled++;
        continue;
      }
    }

    const pad = pads.nth(i);
    await pad.scrollIntoViewIfNeeded();
    await pad.click({ timeout: 8000 });
    await sleep(900);
    await wa
      .locator(".wrs_focusElement, .wrs_editor .wrs_caret")
      .first()
      .waitFor({ state: "visible", timeout: 6000 })
      .catch(() => {});
    await wa.keyboard.press("Meta+a").catch(() => wa.keyboard.press("Control+a").catch(() => {}));
    await wa.keyboard.press("Backspace").catch(() => {});
    if (/infinity/i.test(val)) {
      for (const ch of val) {
        await wa.keyboard.type(ch, { delay: ch === "i" ? 80 : 50 });
      }
    } else {
      await wa.keyboard.type(val, { delay: 45 });
    }
    await commitMathPad(wa, question);

    if (await waitForHidden(wa, question, i, val.toLowerCase() === "undefined" ? 5 : 10)) {
      filled++;
    } else {
      console.warn(`Q${question.number} pad ${i}: hidden field still empty after typing "${val}"`);
    }
  }
  return filled;
}

async function questionRoot(wa, question) {
  return wa.evaluate(({ submitId, number }) => {
    const btn = document.getElementById(submitId);
    if (!btn) return null;
    let root = btn;
    for (let i = 0; i < 20 && root; i++) {
      root = root.parentElement;
      if (!root) break;
      const t = (root.innerText || "").trim();
      if (new RegExp(`^${number}\\.`).test(t) || t.includes(`${number}.\n[`)) break;
    }
    if (!root) root = btn.closest("div") || btn.parentElement;
    root?.setAttribute("data-wa-q-root", String(number));
    return root ? `[data-wa-q-root="${number}"]` : null;
  }, { submitId: question.submitId, number: question.number });
}

export async function fillSelects(wa, question, selections) {
  const sel = await questionRoot(wa, question);
  const scope = sel ? wa.locator(sel) : wa;
  let filled = 0;

  for (const s of selections || []) {
    const loc = s.id
      ? scope.locator(`#${s.id}`)
      : s.name
        ? scope.locator(`select[name="${s.name}"]`)
        : null;
    if (!loc || (await loc.count()) === 0) continue;
    await loc.scrollIntoViewIfNeeded();
    if (s.label) {
      await loc.selectOption({ label: s.label }).catch(async () => {
        if (s.value != null) await loc.selectOption({ value: String(s.value) });
      });
    } else if (s.value != null) {
      await loc.selectOption({ value: String(s.value) });
    }
    filled++;
    await sleep(300);
  }
  return filled;
}

export async function fillTextInputs(wa, question, entries) {
  const sel = await questionRoot(wa, question);
  const scope = sel ? wa.locator(sel) : wa;
  let filled = 0;

  for (const entry of entries || []) {
    const loc = entry.id
      ? scope.locator(`#${entry.id}`)
      : entry.name
        ? scope.locator(`input[name="${entry.name}"]`)
        : null;
    if (!loc || (await loc.count()) === 0) continue;
    await loc.scrollIntoViewIfNeeded();
    await loc.fill(String(entry.value ?? ""));
    filled++;
    await sleep(200);
  }
  return filled;
}

export async function fillRadio(wa, question, radioChoice) {
  if (!radioChoice) return 0;
  const sel = await questionRoot(wa, question);
  const scope = sel ? wa.locator(sel) : wa;
  const { name, value, label } = radioChoice;

  if (name && value != null) {
    const loc = scope.locator(`input[type="radio"][name="${name}"][value="${value}"]`);
    if ((await loc.count()) > 0) {
      await loc.scrollIntoViewIfNeeded();
      await loc.check({ force: true }).catch(() => loc.click({ force: true }));
      await sleep(300);
      return 1;
    }
  }

  if (label) {
    const loc = scope.getByText(label.slice(0, 80), { exact: false }).first();
    if ((await loc.count()) > 0) {
      await loc.scrollIntoViewIfNeeded();
      await loc.click({ force: true });
      await sleep(300);
      return 1;
    }
  }
  return 0;
}

export async function fillRadios(wa, question, choices) {
  let filled = 0;
  for (const choice of choices || []) {
    filled += await fillRadio(wa, question, choice);
  }
  return filled;
}

export async function submitQuestion(wa, question) {
  const btn = wa.locator(`#${question.submitId}`);
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ timeout: 15_000 });
  await sleep(5000);
}

export async function applyAnswer(wa, question, answer) {
  const { drawGraph } = await import("./graph.mjs");
  return {
    graph: answer.graph ? await drawGraph(wa, question, answer.graph) : 0,
    mathPads: answer.mathPads?.length
      ? await fillMathPadsInQuestion(wa, question, answer.mathPads)
      : 0,
    selects: answer.selects?.length ? await fillSelects(wa, question, answer.selects) : 0,
    textInputs: answer.textInputs?.length
      ? await fillTextInputs(wa, question, answer.textInputs)
      : 0,
    radio: answer.radios?.length
      ? await fillRadios(wa, question, answer.radios)
      : await fillRadio(wa, question, answer.radio),
  };
}
