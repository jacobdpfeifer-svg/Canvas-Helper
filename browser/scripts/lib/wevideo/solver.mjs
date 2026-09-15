/**
 * Transcript-first WeVideo interaction solver.
 * Priority: transcript → course notes → optional web → heuristic / OpenAI.
 */
import { loadCourseNotes } from "./course-notes.mjs";

function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreAgainst(text, option) {
  const corpus = new Set(tokenize(text));
  const words = tokenize(option);
  if (!words.length) return 0;
  let hit = 0;
  for (const w of words) if (corpus.has(w)) hit += 1;
  return hit / words.length;
}

async function webSearchSnippet(query) {
  if (process.env.WEVIDEO_NO_WEB === "1") return "";
  try {
    const q = encodeURIComponent(String(query).slice(0, 120));
    const url = `https://html.duckduckgo.com/html/?q=${q}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JacobWeVideo/1.0)" },
    });
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 1500);
  } catch {
    return "";
  }
}

async function openAiSolve(pack) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.WEVIDEO_OPENAI_MODEL || "gpt-4o-mini";
  const prompt = `You answer in-video quiz questions for a CU Boulder student.
Prefer the video transcript. Use course notes next. Use web only if needed.
Return STRICT JSON: {"choiceIndexes":[0-based ints],"text":"free response or null","rationale":"short"}

Type: ${pack.type}
Stem: ${pack.stem}
Options:
${(pack.options || []).map((o, i) => `${i}. ${o}`).join("\n")}

Transcript snippet:
${(pack.transcript || "").slice(0, 3500)}

Course notes:
${(pack.courseNotes || "").slice(0, 1200)}

Web:
${(pack.web || "").slice(0, 800)}
`;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: "Return only JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function heuristicSolve(pack) {
  const type = (pack.type || "").toLowerCase();
  const options = pack.options || [];
  const corpus = [pack.transcript, pack.courseNotes, pack.web].filter(Boolean).join("\n");

  if (/poll/i.test(type) && options.length) {
    return {
      choiceIndexes: [0],
      text: null,
      rationale: "Poll — any selection earns credit",
    };
  }

  if (/free|short_answer|text/i.test(type) || (!options.length && pack.stem)) {
    const sentences = String(pack.transcript || "")
      .split(/[.!?]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 40);
    const stemWords = tokenize(pack.stem);
    let best = sentences[0] || "Based on the video, the main point is clear from the segment just covered.";
    let bestScore = -1;
    for (const s of sentences.slice(0, 40)) {
      const sc = scoreAgainst(s, stemWords.join(" "));
      if (sc > bestScore) {
        bestScore = sc;
        best = s;
      }
    }
    // Keep free responses concise / Jacob-like
    const text = best.slice(0, 280);
    return { choiceIndexes: [], text, rationale: "Transcript paraphrase for free response" };
  }

  if (!options.length) {
    return { choiceIndexes: [], text: "Yes", rationale: "No options — short affirm" };
  }

  const scored = options.map((opt, i) => ({
    i,
    score: scoreAgainst(corpus, opt) * 2 + scoreAgainst(pack.stem, opt) * 0.2,
    opt,
  }));
  scored.sort((a, b) => b.score - a.score);

  if (/check.?all|multi/i.test(type)) {
    const picks = scored.filter((s) => s.score >= Math.max(0.15, scored[0].score * 0.6)).map((s) => s.i);
    return {
      choiceIndexes: picks.length ? picks : [scored[0].i],
      text: null,
      rationale: `Check-all heuristic scores: ${scored
        .slice(0, 4)
        .map((s) => `${s.i}:${s.score.toFixed(2)}`)
        .join(", ")}`,
    };
  }

  return {
    choiceIndexes: [scored[0].i],
    text: null,
    rationale: `MC heuristic best=${scored[0].i} score=${scored[0].score.toFixed(2)}`,
  };
}

/**
 * @param {{ type, stem, options, transcript, courseCode }} interaction
 */
export async function solveQuestion(interaction) {
  const { courseNotes, writingVoice } = loadCourseNotes(interaction.courseCode);
  const pack = {
    type: interaction.type || "multiple_choice",
    stem: interaction.stem || "",
    options: interaction.options || [],
    transcript: interaction.transcript || "",
    courseNotes: `${courseNotes}\n${writingVoice}`.trim(),
    web: "",
  };

  const needsWeb =
    !pack.transcript ||
    scoreAgainst(pack.transcript, pack.stem) < 0.05 ||
    /according to|which of the following is true about (?!the video)/i.test(pack.stem);

  if (needsWeb && pack.stem) {
    pack.web = await webSearchSnippet(`${pack.stem} ${(pack.options || []).join(" ")}`);
  }

  const ai = await openAiSolve(pack);
  if (ai && (ai.choiceIndexes?.length || ai.text)) {
    return {
      choiceIndexes: ai.choiceIndexes || [],
      text: ai.text || null,
      rationale: ai.rationale || "openai",
      source: "openai",
    };
  }

  const h = heuristicSolve(pack);
  return { ...h, source: "heuristic" };
}
