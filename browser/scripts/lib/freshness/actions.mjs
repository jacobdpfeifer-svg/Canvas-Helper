/**
 * Announcement text → a few action items the student should notice.
 *
 * Deterministic and dependency-free: the same module runs in the local brain
 * (Node) and, vendored, inside the Chrome extension. Canvas-authored text is
 * data — this only selects and labels sentences; it never follows them.
 */

const NAMED_ENTITIES = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

export function decodeEntities(text) {
  return String(text || "").replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Canvas HTML (announcement, assignment description) → readable plain text. */
export function htmlToText(html) {
  return decodeEntities(
    String(html || "")
      .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, " ")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr|ul|ol)\s*>/gi, "\n")
      .replace(/<\s*li[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const KIND_RULES = [
  {
    kind: "change",
    weight: 5,
    re: /\b(cancel(?:l)?ed|postponed|rescheduled|moved (?:to|from)|pushed (?:back|to)|extended|no class|(?:class|lecture|lab|recitation) (?:is|will be) (?:cancel|online|remote|virtual|on zoom)|room change|new due date|now due|deadline (?:has been |is )?(?:changed|extended|moved))\b/i,
  },
  { kind: "exam", weight: 4, re: /\b(exam|midterm|final exam|quiz(?:zes)?)\b/i },
  {
    kind: "deadline",
    weight: 3,
    re: /\b(due|deadline|submit|submission|turn(?:ed)? in|11:59)\b/i,
  },
  {
    kind: "task",
    weight: 2,
    re: /\b(read|watch|bring|complete|finish|review|prepare|sign up|register|install|download|print|fill out|attend|make sure|don'?t forget|remember to|required|mandatory)\b/i,
  },
];

const DATE_RE =
  /\b(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep(?:t)?|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b|\b\d{1,2}\/\d{1,2}\b|\b(?:today|tonight|tomorrow|this week|next week|next class|end of (?:the )?(?:day|week))\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i;

const PLEASANTRY_RE = /^(hi|hello|hey|dear|good (morning|afternoon|evening)|best|thanks|thank you|cheers|have a (great|good)|see you|regards|sincerely)\b/i;

const MAX_ACTION_CHARS = 240;

function splitSentences(text) {
  const out = [];
  for (const line of String(text || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const part of trimmed.split(/(?<=[.!?])\s+(?=["“(]?[A-Z0-9])/)) {
      const s = part.trim();
      if (s) out.push(s);
    }
  }
  return out;
}

function clip(text) {
  return text.length > MAX_ACTION_CHARS ? `${text.slice(0, MAX_ACTION_CHARS - 1).trimEnd()}…` : text;
}

/**
 * @param {string} text plain text (use htmlToText first for Canvas HTML)
 * @param {{ limit?: number }} [opts]
 * @returns {{ kind: "change"|"exam"|"deadline"|"task", text: string, has_date: boolean }[]}
 */
export function extractActions(text, { limit = 3 } = {}) {
  const scored = [];
  const seen = new Set();
  splitSentences(text).forEach((sentence, index) => {
    const key = sentence.toLowerCase();
    if (seen.has(key) || sentence.length < 12) return;
    seen.add(key);
    const matched = KIND_RULES.filter((rule) => rule.re.test(sentence));
    if (!matched.length) return;
    const hasDate = DATE_RE.test(sentence);
    let score = Math.max(...matched.map((rule) => rule.weight)) + (hasDate ? 2 : 0);
    if (PLEASANTRY_RE.test(sentence)) score -= 3;
    if (score < 4) return;
    scored.push({ index, score, kind: matched[0].kind, text: clip(sentence), has_date: hasDate });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map(({ kind, text: t, has_date }) => ({ kind, text: t, has_date }));
}

/** First ~N characters of an announcement for a preview line. */
export function previewText(text, max = 280) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Normalize a title for grouping duplicate notices about the same item. */
export function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
