/**
 * Shared CU Canvas SSO session helpers.
 *
 * Truth path: session cookies → same /api/v1 REST as a PAT would use.
 * Playwright is auth + transport, not a second product.
 */
import { chromium } from "playwright";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const BASE = "https://canvas.colorado.edu";
export const ROOT = path.join(__dirname, "..", "..", "..");
export const AUTH_DIR =
  process.env.AUTH_DIR || path.join(__dirname, "..", "..", ".auth");
export const INBOX_DIR = path.join(ROOT, "inbox");
export const COURSES_DIR = path.join(INBOX_DIR, "courses");
export const COURSES_RAW_DIR = path.join(COURSES_DIR, "_raw");
export const WEEK_PATH = path.join(INBOX_DIR, "week.md");

const POLICY_PAGE_RE =
  /professional|participation|policy|syllabus|grading|integrity|gen\s*ai|expectation/i;
export const CATALOG_DAYS = Number(process.env.CATALOG_DAYS || 90);

/** Map Canvas course name/code → inbox/courses/CODE.md */
export const COURSE_FILE_MAP = [
  { code: "CSCI1200", patterns: [/csci\s*1200/i] },
  { code: "APPM1235", patterns: [/appm\s*1235/i] },
  { code: "BCOR1030", patterns: [/bcor\s*1030/i] },
  { code: "COEN1500", patterns: [/coen\s*1500/i] },
  { code: "ECON2010", patterns: [/econ\s*2010/i] },
  {
    code: "CALCREADY",
    patterns: [/readiness\s*prep/i, /calculus\s*1\s*readiness/i],
  },
  {
    code: "ONLINEEXP",
    patterns: [/online\s*experience/i, /leeds.*orientation/i],
  },
];

const TZ = "America/Denver";

export function clearSingletonLocks(authDir = AUTH_DIR) {
  for (const name of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
    try {
      fs.unlinkSync(path.join(authDir, name));
    } catch {
      /* absent is fine */
    }
  }
}

export async function launchCanvasContext(options = {}) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  clearSingletonLocks();
  const headless = process.env.HEADLESS === "1";
  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless,
    viewport: { width: 1280, height: 900 },
    ...options,
  });
  const page = context.pages()[0] || (await context.newPage());
  return { context, page };
}

export async function requireLoggedIn(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  try {
    await page.waitForURL(/canvas\.colorado\.edu/i, { timeout: 45_000 });
  } catch {
    /* may already be on Canvas after SAML */
  }
  await page.waitForTimeout(2000);
  const onLogin =
    page.url().includes("login") ||
    page.url().includes("fedauth.colorado.edu") ||
    (await page.locator("text=IdentiKey").count()) > 0 ||
    (await page.locator('input[name="username"], #username').count()) > 0;
  if (onLogin) {
    throw new Error(
      "Not logged in. Run: cd browser && npm run open-canvas — complete IdentiKey/MFA, then retry."
    );
  }
}

/** America/Denver calendar day as YYYY-MM-DD (not UTC). */
export function denverDay(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** @deprecated Prefer denverDay for window bounds. */
export function isoDay(d = new Date()) {
  return denverDay(d);
}

function denverHour(ms) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }).format(new Date(ms))
  );
}

/** UTC instant for midnight on `dayStr` (YYYY-MM-DD) in America/Denver. */
export function denverMidnightUtc(dayStr) {
  const [year, month, day] = dayStr.split("-").map(Number);
  let lo = Date.UTC(year, month - 1, day - 1, 12, 0, 0);
  let hi = Date.UTC(year, month - 1, day + 1, 12, 0, 0);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const midDay = denverDay(new Date(mid));
    if (midDay < dayStr) lo = mid + 1;
    else hi = mid;
  }
  let t = lo;
  while (denverDay(new Date(t)) === dayStr && denverHour(t) > 0) {
    t -= 3600000;
  }
  while (denverDay(new Date(t)) !== dayStr) t += 3600000;
  return new Date(t);
}

/** Add calendar days in Denver, returning YYYY-MM-DD. */
export function addDenverDays(dayStr, n) {
  const start = denverMidnightUtc(dayStr);
  return denverDay(new Date(start.getTime() + Number(n) * 86400000));
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item == null || item === "") continue;
        qs.append(key, String(item));
      }
    } else {
      qs.set(key, String(value));
    }
  }
  return qs;
}

/** Session-authenticated Canvas REST (cookies, not developer PAT). */
export async function api(page, pathAndQuery) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await page.evaluate(async (pq) => {
        const res = await fetch(pq, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const text = await res.text();
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          json = text.slice(0, 500);
        }
        return {
          ok: res.status >= 200 && res.status < 300,
          status: res.status,
          json,
        };
      }, pathAndQuery);
    } catch (e) {
      const msg = String(e?.message || e);
      if (attempt === 2 || !msg.includes("Execution context was destroyed")) throw e;
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
    }
  }
}

const API_RETRIES = 3;
const API_RETRY_MS = 500;

async function apiWithRetry(page, pathAndQuery) {
  let last = null;
  for (let attempt = 1; attempt <= API_RETRIES; attempt++) {
    last = await api(page, pathAndQuery);
    if (last.ok || last.status < 500) return last;
    if (attempt < API_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, API_RETRY_MS * attempt));
    }
  }
  return last;
}

async function apiGet(page, pathBase, params = {}) {
  const qs = buildQuery(params);
  const sep = pathBase.includes("?") ? "&" : "?";
  const query = qs ? `${sep}${qs}` : "";
  const r = await apiWithRetry(page, `${pathBase}${query}`);
  return {
    ok: r.ok,
    status: r.status,
    json: r.json,
    error: r.ok ? null : r.json,
  };
}

export async function apiAllPages(page, pathBase, params = {}) {
  const items = [];
  let pageNum = 1;
  let truncated = false;
  let lastStatus = 200;
  for (;;) {
    const qs = buildQuery({
      ...params,
      per_page: params.per_page || "100",
      page: String(pageNum),
    });
    const sep = pathBase.includes("?") ? "&" : "?";
    const r = await apiWithRetry(page, `${pathBase}${sep}${qs}`);
    lastStatus = r.status;
    if (!r.ok) {
      // Keep partial pages rather than discarding a successful first page.
      if (items.length) {
        return {
          ok: true,
          items,
          truncated: true,
          status: lastStatus,
          partial: true,
          error: r.json,
        };
      }
      return { ok: false, status: r.status, items, error: r.json, truncated };
    }
    const batch = Array.isArray(r.json) ? r.json : [];
    items.push(...batch);
    if (batch.length < Number(params.per_page || 100)) {
      return { ok: true, items, truncated, status: lastStatus };
    }
    pageNum += 1;
    if (pageNum > 20) {
      truncated = true;
      return { ok: true, items, truncated, status: lastStatus };
    }
  }
}

/** Planner items across a date range, chunked to avoid per-request caps. */
async function fetchPlannerItems(page, startIso, endIso, extraParams = {}) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const chunkMs = 7 * 86400000;
  const allItems = [];
  let truncated = false;
  let ok = true;
  let lastStatus = 200;

  for (let cursor = start.getTime(); cursor < end.getTime(); cursor += chunkMs) {
    const chunkEnd = new Date(Math.min(cursor + chunkMs, end.getTime()));
    const res = await apiAllPages(page, "/api/v1/planner/items", {
      start_date: new Date(cursor).toISOString(),
      end_date: chunkEnd.toISOString(),
      ...extraParams,
    });
    lastStatus = res.status;
    if (!res.ok) {
      ok = false;
      if (!allItems.length) return res;
      truncated = true;
      break;
    }
    allItems.push(...(res.items || []));
    if (res.truncated) truncated = true;
  }

  return { ok, items: allItems, truncated, status: lastStatus };
}

export function escCell(s) {
  return String(s ?? "")
    .replace(/\|/g, "/")
    .replace(/\n/g, " ")
    .trim();
}

export function keyOf(course, title, due) {
  return `${(course || "").toLowerCase()}||${(title || "").toLowerCase()}||${(due || "").slice(0, 10)}`;
}

/**
 * Heuristic outcome / friction label for inbox Notes.
 * Sync stays mechanical — does not write P-scores (skill computes those).
 */
export function resolveCourseFile(courseName, courseCode) {
  const blob = `${courseName || ""} ${courseCode || ""}`;
  for (const entry of COURSE_FILE_MAP) {
    if (entry.patterns.some((p) => p.test(blob))) {
      return path.join(COURSES_DIR, `${entry.code}.md`);
    }
  }
  return null;
}

export function isCheckpoint(title, type) {
  const blob = `${title || ""} ${type || ""}`;
  const hint = classifyOutcomeHint(title, type);
  if (hint.includes("outcome:quiz")) return true;
  if (hint.includes("outcome:presentation")) return true;
  if (/thought\s*project/i.test(blob)) return true;
  return /\bquiz\b|\bexam\b|midterm|final/i.test(blob);
}

export function outcomeLabel(title, type) {
  const hint = classifyOutcomeHint(title, type);
  const m = hint.match(/^outcome:(\w+)/);
  return m ? m[1] : hint ? hint.split(";")[0].trim() : "-";
}

/** Open catalog rows for course arc (~term window + checkpoints). */
export function filterCatalogRows(rows, { today, catalogDays = CATALOG_DAYS } = {}) {
  const startDay = today || denverDay();
  const endDay = addDenverDays(startDay, Number(catalogDays || 90));

  return (rows || [])
    .filter((r) => {
      if (r.complete) return false;
      if (isCheckpoint(r.title, r.type)) return true;
      if (!r.due) return true;
      const dueDay = denverDay(new Date(r.due));
      if (dueDay < startDay) return true;
      return dueDay <= endDay;
    })
    .sort((a, b) => String(a.due).localeCompare(String(b.due)));
}

export function formatCatalogTable(rows) {
  const header =
    "| Name | Due | Points | Type | Outcome | Status |\n|------|-----|--------|------|---------|--------|";
  if (!rows?.length) {
    return `${header}\n| | | | | | |`;
  }
  return [
    header,
    ...rows.map((r) => {
      const due = r.due ? String(r.due).replace("T", " ").slice(0, 16) : "";
      const status = r.complete ? "complete" : "open";
      return `| ${escCell(r.title)} | ${escCell(due)} | ${escCell(r.points)} | ${escCell(
        r.type
      )} | ${escCell(outcomeLabel(r.title, r.type))} | ${status} |`;
    }),
  ].join("\n");
}

export function formatCheckpoints(rows) {
  const cps = (rows || []).filter((r) => isCheckpoint(r.title, r.type));
  if (!cps.length) {
    return "- (no quizzes/exams or major milestones on record yet)";
  }
  return cps
    .map((r) => {
      const due = r.due
        ? String(r.due).replace("T", " ").slice(0, 16)
        : "undated";
      const pts = r.points != null && r.points !== "" ? `${r.points} pts` : "points TBD";
      return `- **${r.title}** — due ${due}; ${pts} (${r.type})`;
    })
    .join("\n");
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(content, heading) {
  const marker = `## ${heading}`;
  const text = String(content || "");
  const idx = text.indexOf(marker);
  if (idx === -1) return "";
  const after = text.slice(idx + marker.length).replace(/^\s*\n/, "");
  const next = after.search(/\n## /);
  return (next === -1 ? after : after.slice(0, next)).trim();
}

function isPlaceholderSection(body) {
  const t = String(body || "").trim();
  return (
    !t ||
    t === "-" ||
    t === "(sync fills quizzes/exams with due dates)" ||
    t.startsWith("(none")
  );
}

function parseCourseHeader(existing, fallbackName) {
  const line = String(existing || "")
    .split("\n")
    .find((l) => l.startsWith("# "));
  if (line) return line.replace(/^#\s*/, "").trim();
  return fallbackName;
}

function parseMetaField(existing, label) {
  const re = new RegExp(`^${escapeRegExp(label)}:\\s*([^\\n]*)`, "m");
  const m = String(existing || "").match(re);
  if (!m) return "";
  const value = m[1].trim();
  if (!value || value.startsWith("##")) return "";
  if (label === "Sections" && /^Canvas URL:?$/i.test(value)) return "";
  return value;
}

function cleanSectionBody(body, heading) {
  let text = String(body || "").trim();
  const marker = `## ${heading}`;
  while (text.startsWith(marker)) {
    text = text.slice(marker.length).trim();
  }
  return text;
}

/** Strip HTML to plain text for syllabus cache (minimal, no dependency). */
export function stripHtmlTags(html) {
  let text = String(html || "");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/ *\n */g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/** Extract href values from HTML assignment descriptions. */
export function extractLinksFromHtml(html) {
  const links = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(String(html || ""))) !== null) {
    links.push(m[1]);
  }
  return links;
}

/** @param {string} html */
export function hasCampusGroupsLink(html) {
  const blob = String(html || "").toLowerCase();
  return /campusgroups\.com|cglink\.me/.test(blob);
}

/** External RSVP off Canvas (CampusGroups, cglink, or CU engineering dinner schedule). */
export function hasExternalSignupLink(html) {
  const blob = String(html || "").toLowerCase();
  return (
    hasCampusGroupsLink(html) ||
    /engineering-connections-major-dinners|major-dinners/.test(blob)
  );
}

export function isCoenTwoStepSignup(title) {
  return /major\s*dinner|ai\s*lab\s*workshop/i.test(String(title || ""));
}

/** @param {string} html */
export function hasUploadAfterEventHint(html) {
  const blob = stripHtmlTags(html).toLowerCase();
  return /selfie|after you attend|post-dinner|after the dinner|after attending|upload.*after/.test(
    blob
  );
}

export function isSignupTitle(title, type) {
  const blob = `${title || ""} ${type || ""}`.toLowerCase();
  return /sign\s*up|signup|dinner|workshop|calendar_event/.test(blob) || type === "calendar_event";
}

/** Build week.md Notes column parts for a sync row. */
export function buildWeekNoteParts(row) {
  const hint = classifyOutcomeHint(row.title, row.type, row.description);
  const parts = [(row.sources || [row.source]).join("+"), "open", hint].filter(Boolean);
  if (row.html_url) {
    const url = String(row.html_url).startsWith("http")
      ? row.html_url
      : `${BASE}${row.html_url}`;
    parts.push(`url:${url}`);
  }
  return parts;
}

export function syllabusHash(body) {
  return crypto.createHash("sha256").update(String(body || ""), "utf8").digest("hex").slice(0, 16);
}

const AGENT_POLICY_KV_RE = /^\s*([a-z_]+)\s*:\s*(.*?)\s*$/i;
const AGENT_POLICY_KEYS = new Set(["agent_writes", "allow_tools", "note"]);

/**
 * Parse agent_writes / allow_tools / note from syllabus plain text.
 * Mirrors src/canvas_mcp/core/course_policy.py conflict rules.
 */
export function parseAgentPolicyFromSyllabus(body) {
  const values = {};
  for (const line of String(body || "").split(/\r?\n/)) {
    const match = AGENT_POLICY_KV_RE.exec(line);
    if (!match) continue;
    const key = match[1].toLowerCase();
    if (!AGENT_POLICY_KEYS.has(key)) continue;
    if (!values[key]) values[key] = [];
    values[key].push(match[2].trim());
  }

  const writeDirectives = new Set(
    (values.agent_writes || []).map((v) => v.toLowerCase())
  );
  const note = (values.note || [""])[0];
  const hasMarker = writeDirectives.size > 0;

  if (writeDirectives.size > 1) {
    return {
      hasMarker: true,
      agentWrites: "conflict",
      allowTools: null,
      note:
        note ||
        "Syllabus states conflicting agent_writes values — treat as deny until instructor fixes.",
    };
  }

  const agentWrites = writeDirectives.size ? [...writeDirectives][0] : "";

  if (agentWrites === "allow") {
    const toolDirectives = new Set(values.allow_tools || []);
    if (toolDirectives.size > 1) {
      return {
        hasMarker: true,
        agentWrites: "conflict",
        allowTools: null,
        note:
          note ||
          "Syllabus lists conflicting allow_tools values — treat as deny until instructor fixes.",
      };
    }
    const rawTools = toolDirectives.size ? [...toolDirectives][0] : "";
    const tools = rawTools
      .replace(/,/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (values.allow_tools && !tools.length) {
      return {
        hasMarker: true,
        agentWrites: "conflict",
        allowTools: null,
        note:
          note ||
          "Syllabus allows agent writes but allow_tools is empty — treat as deny.",
      };
    }
    return {
      hasMarker: true,
      agentWrites: "allow",
      allowTools: tools.length ? tools : null,
      note,
    };
  }

  if (agentWrites === "deny") {
    return { hasMarker: true, agentWrites: "deny", allowTools: null, note };
  }

  if (hasMarker) {
    return {
      hasMarker: true,
      agentWrites: "malformed",
      allowTools: null,
      note: note || "Syllabus agent_writes value could not be interpreted — treat as deny.",
    };
  }

  return { hasMarker: false, agentWrites: "", allowTools: null, note: "" };
}

/** Sync-owned markdown for ## Syllabus / agent policy notes */
export function formatAgentPolicyNotes(syllabusPlain, today) {
  const synced = today || denverDay();
  const parsed = parseAgentPolicyFromSyllabus(syllabusPlain);
  if (!parsed.hasMarker) {
    return [
      `(synced ${synced})`,
      "",
      "No `agent_writes:` marker in Canvas syllabus — MCP uses default posture",
      "(deny unless `COURSE_AGENT_POLICY_DEFAULT=allow`).",
      "",
      "Instructor may add to syllabus:",
      "```",
      "agent_writes: allow",
      "allow_tools: submit_assignment",
      "```",
    ].join("\n");
  }

  const lines = [`(synced ${synced})`, ""];
  if (parsed.agentWrites === "conflict" || parsed.agentWrites === "malformed") {
    lines.push(`agent_writes: ${parsed.agentWrites} (synced ${synced})`);
  } else {
    lines.push(`agent_writes: ${parsed.agentWrites} (synced ${synced})`);
  }
  if (parsed.allowTools?.length) {
    lines.push(`allow_tools: ${parsed.allowTools.join(" ")}`);
  }
  if (parsed.note) {
    lines.push(`note: ${parsed.note}`);
  }
  return lines.join("\n");
}

function extractSubsection(body, heading) {
  const marker = `### ${heading}`;
  const text = String(body || "");
  const idx = text.indexOf(marker);
  if (idx === -1) return "";
  const after = text.slice(idx + marker.length).replace(/^\s*\n/, "");
  const next = after.search(/\n### /);
  return (next === -1 ? after : after.slice(0, next)).trim();
}

function removeSubsection(body, heading) {
  const marker = `### ${heading}`;
  const text = String(body || "");
  const idx = text.indexOf(marker);
  if (idx === -1) return text.trim();
  const after = text.slice(idx + marker.length);
  const next = after.search(/\n### /);
  const tail = next === -1 ? "" : after.slice(next);
  return (text.slice(0, idx).trim() + (tail ? `\n${tail.trim()}` : "")).trim();
}

function formatPolicyPagesList(pages) {
  if (!pages?.length) {
    return "- (none matched policy keywords yet)";
  }
  return pages
    .map((p) => {
      const title = p.title || p.url || "Untitled";
      const url = p.html_url || p.url || "";
      return url ? `- ${title} — ${url}` : `- ${title}`;
    })
    .join("\n");
}

export function formatTeachers(teachers) {
  const list = (teachers || []).filter((t) => t && (t.display_name || t.name));
  if (!list.length) return "";
  return list
    .map((t) => {
      const name = t.display_name || t.name;
      return t.id ? `${name} (id ${t.id})` : name;
    })
    .join("; ");
}

function isInstructorProfilePlaceholder(body) {
  const t = String(body || "").trim();
  return (
    !t ||
    t === "-" ||
    /Profile updated:\s*\(agent fills/i.test(t) ||
    /^### Grading and weights\s*\n\s*-\s*$/m.test(t)
  );
}

function formatInstructorProfileBlock(agentBody, policyPages) {
  const policyBlock = `### Policy pages (synced)\n\n${formatPolicyPagesList(policyPages)}\n`;
  if (isInstructorProfilePlaceholder(agentBody)) {
    return `Profile updated: (agent fills via \`jacob-instructor-profile\`)\n\n${policyBlock}`;
  }
  const withoutPolicy = removeSubsection(agentBody, "Policy pages (synced)").trim();
  return `${withoutPolicy}\n\n${policyBlock}`;
}

/**
 * Merge sync-owned catalog/checkpoints into inbox/courses/CODE.md.
 * Preserves Theme, Arc notes, Instructor profile (agent), Syllabus, Modules, Worth when present.
 */
export function mergeCourseFileContent({
  existingContent,
  courseTitle,
  catalogRows,
  today,
  syncMeta = {},
}) {
  const existing = String(existingContent || "");
  const header = parseCourseHeader(existing, courseTitle);
  const sections = existing ? existing : "";
  const theme = cleanSectionBody(extractSection(sections, "Theme"), "Theme");
  const arcNotes = cleanSectionBody(extractSection(sections, "Arc notes"), "Arc notes");
  const lectureCaptures = cleanSectionBody(
    extractSection(sections, "Lecture captures"),
    "Lecture captures"
  );
  const instructorProfile = cleanSectionBody(
    extractSection(sections, "Instructor profile"),
    "Instructor profile"
  );
  const syllabus = cleanSectionBody(
    extractSection(sections, "Syllabus / agent policy notes"),
    "Syllabus / agent policy notes"
  );
  const modules = cleanSectionBody(
    extractSection(sections, "Modules / what's next"),
    "Modules / what's next"
  );
  const worth = cleanSectionBody(
    extractSection(sections, "Worth Jacob's time defaults"),
    "Worth Jacob's time defaults"
  );
  const registrationLog = cleanSectionBody(
    extractSection(sections, "Registration log"),
    "Registration log"
  );

  const sectionsLine = parseMetaField(existing, "Sections");
  const canvasUrl =
    syncMeta.canvasUrl || parseMetaField(existing, "Canvas URL");
  const primaryInstructors =
    syncMeta.primaryInstructors || parseMetaField(existing, "Primary instructor(s)");
  const tas = syncMeta.tas || parseMetaField(existing, "TA(s)");
  const syllabusHashValue =
    syncMeta.syllabusHash ||
    (syncMeta.syllabusSynced && !syncMeta.syllabusPlain ? "(none)" : "") ||
    parseMetaField(existing, "Syllabus hash");
  const policyPages = syncMeta.policyPages ?? null;
  const agentPolicyBlock =
    syncMeta.syllabusPlain != null
      ? `${formatAgentPolicyNotes(syncMeta.syllabusPlain, today)}\n`
      : isPlaceholderSection(syllabus)
        ? "-\n"
        : `${syllabus}\n`;

  const themeBlock = isPlaceholderSection(theme) ? "-\n" : `${theme}\n`;
  const arcBlock = isPlaceholderSection(arcNotes) ? "-\n" : `${arcNotes}\n`;
  const lectureBlock = isPlaceholderSection(lectureCaptures)
    ? ""
    : `## Lecture captures\n\n${lectureCaptures}\n\n`;
  const instructorBlock = `${formatInstructorProfileBlock(
    instructorProfile,
    policyPages
  )}\n`;

  return `# ${header}

Updated: ${today || denverDay()}

Sections: ${sectionsLine || ""}
Canvas URL: ${canvasUrl || ""}
Primary instructor(s): ${primaryInstructors || ""}
TA(s): ${tas || ""}
Syllabus hash: ${syllabusHashValue || ""}

## Theme

${themeBlock}
## Checkpoints

${formatCheckpoints(catalogRows)}

## Assignment catalog

Synced from Canvas \`/api/v1\` (open items, term window). Not the 14d due-list — see \`inbox/week.md\` for what's due now.

${formatCatalogTable(catalogRows)}

## Arc notes

${arcBlock}${lectureBlock}## Instructor profile

${instructorBlock}
## Syllabus / agent policy notes

${agentPolicyBlock}
## Modules / what's next

${isPlaceholderSection(modules) ? "-\n" : `${modules}\n`}
## Worth Jacob's time defaults

${isPlaceholderSection(worth) ? "(See JACOB.md for this course.)\n" : `${worth}\n`}
${isPlaceholderSection(registrationLog) ? "" : `## Registration log\n\n${registrationLog}\n`}
`;
}

export function writeCourseCatalogFiles(perCourse, { today } = {}) {
  const syncDay = today || denverDay();
  fs.mkdirSync(COURSES_DIR, { recursive: true });
  fs.mkdirSync(COURSES_RAW_DIR, { recursive: true });
  const written = [];

  for (const course of perCourse || []) {
    const filePath = resolveCourseFile(course.name, course.code);
    if (!filePath) {
      console.warn(
        `No catalog mapping for enrolled course: ${course.name} (${course.code || course.id})`
      );
      continue;
    }

    const code = path.basename(filePath, ".md");
    if (course.syllabusPlain) {
      const rawPath = path.join(COURSES_RAW_DIR, `${code}-syllabus.txt`);
      fs.writeFileSync(rawPath, course.syllabusPlain, "utf8");
    }

    const catalogRows = filterCatalogRows(course.rows || [], { today: syncDay });
    let existing = "";
    try {
      existing = fs.readFileSync(filePath, "utf8");
    } catch {
      /* new file */
    }

    const syncMeta = {
      canvasUrl: course.canvasUrl || "",
      primaryInstructors: course.primaryInstructors || "",
      tas: course.tas || "",
      syllabusHash: course.syllabusHash || "",
      syllabusPlain: course.syllabusPlain ?? null,
      syllabusSynced: !!course.syllabus_ok,
      policyPages: course.policyPages || [],
    };

    const md = mergeCourseFileContent({
      existingContent: existing,
      courseTitle: course.name,
      catalogRows,
      today: syncDay,
      syncMeta,
    });
    fs.writeFileSync(filePath, md, "utf8");
    written.push({
      file: filePath,
      code,
      catalogCount: catalogRows.length,
      checkpoints: catalogRows.filter((r) => isCheckpoint(r.title, r.type)).length,
      syllabus: !!course.syllabusPlain,
      policyPages: (course.policyPages || []).length,
    });
  }

  return written;
}

export function classifyOutcomeHint(title, type, description = "") {
  const blob = `${title || ""} ${type || ""}`.toLowerCase();
  const typeStr = String(type || "").toLowerCase();
  const descHtml = String(description || "").toLowerCase();

  if (
    /webassign|zybooks|playposit|play posit|proctor|lockdown|respondus|honorlock|proctored|norton/.test(
      blob
    ) ||
    typeStr === "external_tool" ||
    /eoc|learningcurve/.test(blob)
  ) {
    return "outcome:lti; external/LTI — browser+Jacob; never auto";
  }
  if (/\bquiz\b|exam|midterm|final/.test(blob)) {
    return "outcome:quiz; assessment — Jacob only";
  }
  if (/presentation|in-class\s+present/.test(blob)) {
    return "outcome:presentation; Jacob only";
  }

  const externalSignup =
    hasExternalSignupLink(descHtml) ||
    /campusgroups|cglink\.me|major\s*dinner|ai\s*lab\s*workshop/.test(blob);
  const uploadAfter =
    hasUploadAfterEventHint(description) ||
    hasUploadAfterEventHint(blob) ||
    isCoenTwoStepSignup(title);

  if (externalSignup) {
    let outcome = "outcome:signup-external";
    if (uploadAfter) outcome += "+upload-after-event";
    let extra = "rsvp:CampusGroups";
    if (uploadAfter) extra += "; canvas_submit:post-dinner selfie";
    return `${outcome}; ${extra}`;
  }

  if (isSignupTitle(title, type)) {
    if (uploadAfter) {
      return "outcome:signup+upload-after-event; canvas_submit:post-event upload";
    }
    return "outcome:signup";
  }
  if (/thought\s*project|philosophy\s*of|relationship\s*to\s*engineering/.test(blob)) {
    return "outcome:written; reflection — Jacob voice";
  }
  if (/recitation\s*scan/.test(blob)) {
    return "outcome:written";
  }
  if (/challenge\s*activit/.test(blob)) {
    return "outcome:lab";
  }
  if (/discussion_topic|discussion\b|advocate/.test(blob)) {
    return "outcome:discussion";
  }
  if (/pre[\s-]?reading|pre[\s-]?class|reading\b/.test(blob)) {
    return "outcome:reading";
  }
  if (/\blab\b|pre[\s-]?lab/.test(blob)) {
    return "outcome:lab";
  }
  if (/written\s*hw|essay|reflection|case\b|gen\s*ai\s*assignment|survey/.test(blob)) {
    return "outcome:written";
  }
  if (
    /syllabus\s*video|playlist|training|access\b|orientation/.test(blob) ||
    typeStr === "announcement"
  ) {
    return "outcome:busywork";
  }
  return "";
}

/** Exclude recurring class meetings and non-actionable announcements from week table. */
export function shouldIncludeInWeekTable(row) {
  const type = String(row?.type || "").toLowerCase();
  const title = String(row?.title || "").toLowerCase();

  if (type === "calendar_event" || type === "event") {
    if (
      /section\s*\d+|fall\s*\d+\s*section/.test(title) &&
      !/sign\s*up|signup|dinner|workshop/.test(title)
    ) {
      return false;
    }
  }

  if (type === "announcement") {
    if (
      !row?.points &&
      /available|reminder|answers\/lecture|extensions|class reminders|lecture-video/.test(
        title
      )
    ) {
      return false;
    }
  }

  return true;
}

/** @deprecated Prefer classifyOutcomeHint; kept for callers that only want LTI/assessment. */
export function classifyExternalHint(title, type) {
  const full = classifyOutcomeHint(title, type);
  if (!full) return "";
  if (full.includes("external/LTI") || full.includes("assessment")) {
    return full.replace(/^outcome:\w+;\s*/, "");
  }
  return "";
}

function submissionComplete(submission) {
  if (!submission || typeof submission !== "object") return false;
  if (submission.submitted_at) return true;
  const state = String(submission.workflow_state || "").toLowerCase();
  return state === "submitted" || state === "graded" || state === "pending_review";
}

/** Prefer student override due from all_dates; never treat lock_at as due. */
export function studentDueAt(assignment) {
  const dates = assignment?.all_dates;
  if (Array.isArray(dates) && dates.length) {
    const override = dates.find((d) => d && d.base === false && d.due_at);
    if (override?.due_at) return override.due_at;
    const base = dates.find((d) => d && d.base !== false && d.due_at);
    if (base?.due_at) return base.due_at;
    const any = dates.find((d) => d?.due_at);
    if (any?.due_at) return any.due_at;
  }
  return assignment?.due_at || "";
}

export function fromPlanner(items) {
  const rows = [];
  for (const item of items || []) {
    const p = item.plannable || {};
    const canvasId =
      item.plannable_id || p.id || item.assignment_id || undefined;
    rows.push({
      source: "planner",
      course: item.context_name || item.course_name || item.context_code || "",
      title: p.title || p.name || item.plannable_type || "Untitled",
      due: item.plannable_date || p.due_at || p.todo_date || "",
      points: p.points_possible ?? "",
      type: item.plannable_type || "",
      html_url: item.html_url || p.html_url || "",
      complete: !!(
        item.planner_override?.marked_complete || item.submissions?.submitted
      ),
      course_id:
        item.course_id ||
        (String(item.context_code || "").match(/course_(\d+)/) || [])[1],
      canvas_id: canvasId != null ? String(canvasId) : "",
    });
  }
  return rows;
}

export function fromTodo(items) {
  const rows = [];
  for (const t of items || []) {
    const a = t.assignment || {};
    const submission = a.submission;
    rows.push({
      source: "todo",
      course: t.context_name || a.course_id || "",
      title: a.name || t.type || "Todo",
      due: a.due_at || "",
      points: a.points_possible ?? "",
      type: t.type || "todo",
      html_url: a.html_url || "",
      complete: submissionComplete(submission),
      course_id: a.course_id,
      canvas_id: a.id != null ? String(a.id) : "",
    });
  }
  return rows;
}

export function fromAssignments(courseName, courseId, assignments) {
  const rows = [];
  for (const a of assignments || []) {
    const submissionTypes = a.submission_types || [];
    rows.push({
      source: "course_assignments",
      course: courseName,
      title: a.name || "Assignment",
      due: studentDueAt(a),
      points: a.points_possible ?? "",
      type: submissionTypes.includes("external_tool")
        ? "external_tool"
        : (a.is_quiz_assignment && "quiz") ||
          submissionTypes.join(",") ||
          "assignment",
      html_url: a.html_url || "",
      complete: submissionComplete(a.submission),
      course_id: courseId,
      canvas_id: a.id != null ? String(a.id) : "",
    });
  }
  return rows;
}

export function fromDiscussions(courseName, courseId, topics) {
  const rows = [];
  for (const t of topics || []) {
    const due = t.due_at || t.assignment?.due_at || "";
    if (!due) continue;
    const submission = t.assignment?.submission;
    rows.push({
      source: "discussion_topics",
      course: courseName,
      title: t.title || "Discussion",
      due,
      points: t.assignment?.points_possible ?? t.points_possible ?? "",
      type: t.assignment_id ? "discussion_topic" : "discussion_topic",
      html_url: t.html_url || "",
      complete: submissionComplete(submission),
      course_id: courseId,
      canvas_id: t.id != null ? String(t.id) : "",
    });
  }
  return rows;
}

export function fromCalendar(events) {
  const rows = [];
  for (const e of events || []) {
    const assignment = e.assignment || {};
    rows.push({
      source: "calendar",
      course: e.context_name || e.context_code || "",
      title: e.title || assignment.name || "Event",
      due: assignment.due_at || e.start_at || e.end_at || "",
      points: assignment.points_possible ?? "",
      type: e.type || (assignment.id ? "assignment" : "calendar_event"),
      html_url: e.html_url || assignment.html_url || "",
      complete: false,
      course_id: (String(e.context_code || "").match(/course_(\d+)/) || [])[1],
      canvas_id:
        assignment.id != null
          ? String(assignment.id)
          : e.id != null
            ? `cal_${e.id}`
            : "",
    });
  }
  return rows;
}

export function dedupeRows(rows) {
  const byId = new Map();
  const byKey = new Map();

  const merge = (prev, next) => {
    if (!prev.sources.includes(next.source)) prev.sources.push(next.source);
    if (!prev.due && next.due) prev.due = next.due;
    if ((prev.points === "" || prev.points == null) && next.points != null) {
      prev.points = next.points;
    }
    if (!prev.html_url && next.html_url) prev.html_url = next.html_url;
    if (!prev.type && next.type) prev.type = next.type;
    if (next.complete) prev.complete = true;
    if (!prev.canvas_id && next.canvas_id) prev.canvas_id = next.canvas_id;
    if (!prev.course_id && next.course_id) prev.course_id = next.course_id;
    return prev;
  };

  for (const r of rows) {
    const enriched = { ...r, sources: [r.source] };
    const idKey =
      enriched.canvas_id && String(enriched.canvas_id)
        ? `${enriched.course_id || ""}::${enriched.canvas_id}`
        : null;

    if (idKey) {
      const prev = byId.get(idKey);
      if (!prev) byId.set(idKey, enriched);
      else merge(prev, enriched);
      continue;
    }

    const k = keyOf(enriched.course, enriched.title, enriched.due);
    const prev = byKey.get(k);
    if (!prev) byKey.set(k, enriched);
    else merge(prev, enriched);
  }

  // Fold title-key rows into id rows when titles match (no id on one side).
  for (const [, row] of byKey) {
    let folded = false;
    for (const idRow of byId.values()) {
      if (
        (idRow.title || "").toLowerCase() === (row.title || "").toLowerCase() &&
        String(idRow.course_id || "") === String(row.course_id || "") &&
        (idRow.due || "").slice(0, 10) === (row.due || "").slice(0, 10)
      ) {
        merge(idRow, row);
        folded = true;
        break;
      }
    }
    if (!folded) byId.set(`key::${keyOf(row.course, row.title, row.due)}`, row);
  }

  // Final collapse: same course + title + Denver due-day under different Canvas ids
  // (e.g. planner quiz vs todo "submitting", or calendar event vs planner calendar_event).
  const typeRank = (t) => {
    const x = String(t || "").toLowerCase();
    if (x === "quiz" || x.includes("quiz")) return 5;
    if (x === "assignment" || x === "discussion_topic") return 4;
    if (x === "announcement") return 3;
    if (x === "calendar_event") return 2;
    if (x === "submitting" || x === "event") return 1;
    return 2;
  };

  const byTitleDay = new Map();
  for (const row of byId.values()) {
    const dueDay = row.due ? denverDay(new Date(row.due)) : "";
    const k = `${(row.course || "").toLowerCase()}||${(row.title || "").toLowerCase()}||${dueDay}`;
    const prev = byTitleDay.get(k);
    if (!prev) {
      byTitleDay.set(k, row);
      continue;
    }
    // Prefer richer / more specific row, then merge sources.
    if (typeRank(row.type) > typeRank(prev.type)) {
      merge(row, prev);
      byTitleDay.set(k, row);
    } else {
      merge(prev, row);
    }
  }

  return [...byTitleDay.values()].sort((a, b) =>
    String(a.due).localeCompare(String(b.due))
  );
}

export function filterPolicyPages(pages) {
  return (pages || [])
    .filter((p) => p && (p.published !== false) && POLICY_PAGE_RE.test(String(p.title || "")))
    .map((p) => ({
      title: p.title,
      url: p.url,
      html_url: p.html_url || (p.url ? `${BASE}/courses/${p.course_id || ""}/pages/${p.url}` : ""),
    }))
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));
}

async function fetchCourseInstructorMeta(page, courseId) {
  const detailRes = await apiGet(page, `/api/v1/courses/${courseId}`, {
    "include[]": ["syllabus_body", "teachers"],
  });
  if (!detailRes.ok) {
    return {
      ok: false,
      status: detailRes.status,
      canvasUrl: "",
      primaryInstructors: "",
      tas: "",
      syllabusPlain: "",
      syllabusHash: "",
      policyPages: [],
    };
  }

  const course = detailRes.json || {};
  const teachers = course.teachers || [];
  const primary = formatTeachers(
    teachers.filter((t) => !/ta\b|teaching assistant/i.test(String(t.display_name || t.name || "")))
  );
  const tas = formatTeachers(
    teachers.filter((t) => /ta\b|teaching assistant/i.test(String(t.display_name || t.name || "")))
  );
  const syllabusBody = course.syllabus_body || "";
  const syllabusPlain = stripHtmlTags(syllabusBody);

  const pagesRes = await apiAllPages(page, `/api/v1/courses/${courseId}/pages`, {
    per_page: 100,
  });
  const policyPages = pagesRes.ok
    ? filterPolicyPages(
        (pagesRes.items || []).map((p) => ({
          ...p,
          course_id: courseId,
          html_url: p.html_url || `${BASE}/courses/${courseId}/pages/${p.url}`,
        }))
      )
    : [];

  return {
    ok: true,
    status: detailRes.status,
    canvasUrl: course.html_url || `${BASE}/courses/${courseId}`,
    primaryInstructors: primary || formatTeachers(teachers),
    tas,
    syllabusPlain,
    syllabusHash: syllabusPlain ? syllabusHash(syllabusPlain) : "",
    policyPages,
    pagesOk: pagesRes.ok,
  };
}

function healthEntry(res, extra = {}) {
  return {
    ok: !!res?.ok,
    count: res?.items?.length ?? res?.count ?? 0,
    status: res?.status,
    truncated: !!res?.truncated,
    ...extra,
  };
}

/** Fetch assignment descriptions for signup-titled rows (CampusGroups link detection). */
export async function enrichSignupDescriptions(page, universe) {
  const signupRows = (universe || []).filter(
    (r) => isSignupTitle(r.title, r.type) && r.course_id && r.canvas_id && !r.description
  );
  const byKey = new Map();
  for (const row of signupRows) {
    const key = `${row.course_id}:${row.canvas_id}`;
    if (byKey.has(key)) continue;
    byKey.set(key, row);
  }

  for (const row of byKey.values()) {
    const res = await api(
      page,
      `/api/v1/courses/${row.course_id}/assignments/${row.canvas_id}`
    );
    if (res.ok && res.json?.description) {
      row.description = res.json.description;
      for (const r of universe) {
        if (r.course_id === row.course_id && r.canvas_id === row.canvas_id) {
          r.description = res.json.description;
        }
      }
    }
  }
}

/**
 * Fetch the canonical due-work universe via SSO session → /api/v1.
 * Prefer this over DOM scraping. Used by both sync and audit.
 */
export async function fetchDueUniverse(page, { daysAhead = 14 } = {}) {
  const today = denverDay();
  const start = denverMidnightUtc(today);
  const end = denverMidnightUtc(addDenverDays(today, daysAhead));
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const startDay = today;
  const endDay = addDenverDays(today, daysAhead);
  const health = {};

  const coursesRes = await apiAllPages(page, "/api/v1/courses", {
    enrollment_state: "active",
  });
  health.courses = healthEntry(coursesRes);
  if (!coursesRes.ok) {
    throw new Error(
      `Courses API failed (${coursesRes.status}). Re-run open-canvas or check session.`
    );
  }
  const courses = coursesRes.items || [];

  const plannerRes = await fetchPlannerItems(page, startIso, endIso);
  health.planner = healthEntry(plannerRes);

  // Second pass: incomplete items (peer review / assessment_request gaps).
  // Soft-fail: some Canvas tenants reject this filter (HTTP 400).
  const plannerIncompleteRes = await fetchPlannerItems(page, startIso, endIso, {
    filter: "incomplete_items",
  });
  health.planner_incomplete = healthEntry(plannerIncompleteRes);
  if (!plannerIncompleteRes.ok) {
    console.warn(
      "Planner incomplete_items filter unavailable; continuing without that pass."
    );
  }

  const todoRes = await apiAllPages(page, "/api/v1/users/self/todo", {});
  health.todo = healthEntry(todoRes);

  const contextCodes = courses.map((c) => `course_${c.id}`);
  let calAssign = { ok: true, items: [], truncated: false };
  let calEvents = { ok: true, items: [], truncated: false };
  if (contextCodes.length) {
    calAssign = await apiAllPages(page, "/api/v1/calendar_events", {
      type: "assignment",
      start_date: startDay,
      end_date: endDay,
      "context_codes[]": contextCodes,
      all_events: "true",
    });
    calEvents = await apiAllPages(page, "/api/v1/calendar_events", {
      type: "event",
      start_date: startDay,
      end_date: endDay,
      "context_codes[]": contextCodes,
      all_events: "true",
    });
  }
  health.calendar_assignments = healthEntry(calAssign);
  health.calendar_events = healthEntry(calEvents);

  const allRows = [
    ...fromPlanner(plannerRes.items),
    ...(plannerIncompleteRes.ok
      ? fromPlanner(plannerIncompleteRes.items)
      : []),
    ...fromTodo(todoRes.items),
    ...fromCalendar(calAssign.items),
    ...fromCalendar(calEvents.items),
  ];

  const perCourse = [];
  let assignmentHardFail = false;
  let syllabusFail = 0;
  let syllabusOk = 0;
  for (const c of courses) {
    const id = c.id;
    const name = c.name || c.course_code || String(id);
    const aRes = await apiAllPages(page, `/api/v1/courses/${id}/assignments`, {
      order_by: "due_at",
      "include[]": ["submission", "all_dates"],
    });
    const dRes = await apiAllPages(
      page,
      `/api/v1/courses/${id}/discussion_topics`,
      {
        "include[]": ["assignment", "all_dates"],
      }
    );
    const instructorMeta = await fetchCourseInstructorMeta(page, id);
    if (instructorMeta.ok) syllabusOk += 1;
    else syllabusFail += 1;

    const aRows = aRes.ok ? fromAssignments(name, id, aRes.items || []) : [];
    const dRows = dRes.ok ? fromDiscussions(name, id, dRes.items || []) : [];
    const courseRows = dedupeRows([...aRows, ...dRows]);
    perCourse.push({
      id,
      name,
      code: c.course_code,
      rows: courseRows,
      assignments_ok: aRes.ok,
      assignments_count: aRows.length,
      assignments_truncated: !!aRes.truncated,
      discussions_ok: dRes.ok,
      discussions_count: dRows.length,
      canvasUrl: instructorMeta.canvasUrl,
      primaryInstructors: instructorMeta.primaryInstructors,
      tas: instructorMeta.tas,
      syllabusPlain: instructorMeta.syllabusPlain,
      syllabusHash: instructorMeta.syllabusHash,
      policyPages: instructorMeta.policyPages,
      syllabus_ok: instructorMeta.ok,
    });
    if (!aRes.ok) assignmentHardFail = true;
    if (aRes.ok) allRows.push(...aRows);
    if (dRes.ok) allRows.push(...dRows);
  }

  health.assignments = {
    ok: !assignmentHardFail,
    count: perCourse.reduce((n, c) => n + c.assignments_count, 0),
    truncated: perCourse.some((c) => c.assignments_truncated),
  };
  health.discussions = {
    ok: perCourse.every((c) => c.discussions_ok),
    count: perCourse.reduce((n, c) => n + c.discussions_count, 0),
  };
  health.syllabus = {
    ok: syllabusFail === 0,
    count: syllabusOk,
    failed: syllabusFail,
  };

  if (assignmentHardFail) {
    console.warn(
      "Warning: one or more per-course assignment fetches failed; week list may be incomplete."
    );
  }

  const universe = dedupeRows(allRows);
  await enrichSignupDescriptions(page, universe);
  return {
    courses,
    universe,
    health,
    perCourse,
    start,
    end,
    today,
    startDay,
    endDay,
  };
}

/** Rows with a real due date inside [today, today+daysAhead] (Denver days). */
export function filterDatedInWindow(universe, { today, daysAhead, includeComplete = false } = {}) {
  const startDay = today || denverDay();
  const endDay = addDenverDays(startDay, Number(daysAhead || 14));

  return (universe || []).filter((r) => {
    if (!r.due) return false;
    if (!includeComplete && r.complete) return false;
    const dueDay = denverDay(new Date(r.due));
    return dueDay >= startDay && dueDay <= endDay;
  });
}

/** Collect human-readable truncation warnings from sync health. */
export function collectTruncationWarnings(health) {
  const warnings = [];
  if (!health) return warnings;
  const labels = {
    courses: "courses",
    planner: "planner",
    planner_incomplete: "planner_incomplete",
    todo: "todo",
    calendar_assignments: "calendar_assignments",
    calendar_events: "calendar_events",
    assignments: "assignments",
    discussions: "discussions",
    syllabus: "syllabus",
  };
  for (const [key, label] of Object.entries(labels)) {
    if (health[key]?.truncated) {
      warnings.push(`${label} (count=${health[key].count ?? 0})`);
    }
  }
  return warnings;
}

