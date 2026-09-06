/**
 * Build curated school calendar manifest from Canvas + inbox sources.
 * Output: inbox/calendar-manifest.json
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  INBOX_DIR,
  COURSES_DIR,
  COURSE_FILE_MAP,
  addDenverDays,
  apiAllPages,
  denverDay,
  formatDueDenver,
} from "./canvas-session.mjs";

export const TZ = "America/Denver";
export const MANIFEST_PATH = path.join(INBOX_DIR, "calendar-manifest.json");
export const QUEUE_PATH = path.join(INBOX_DIR, "calendar-queue.md");
export const POLICY_PATH = path.join(ROOT, ".jacob", "calendar-policy.md");
export const SIGNUP_PREFS_PATH = path.join(ROOT, ".jacob", "signup-preferences.md");

/** Fall 2026 term window (America/Denver calendar days). */
export const TERM_START = "2026-08-25";
export const TERM_END = "2026-12-15";
export const TERM_RRULE_UNTIL = "20261210T235959";

const DAY_MAP = { Sun: "SU", Mon: "MO", Tue: "TU", Wed: "WE", Thu: "TH", Fri: "FR", Sat: "SA" };

/** Section meetings from Canvas calendar_events — inverse of week-table filter. */
export function isSectionMeeting(title) {
  const t = String(title || "").toLowerCase();
  if (/sign\s*up|signup|dinner|workshop/.test(t)) return false;
  return /section\s*\d+|fall\s*\d+\s*section/.test(t);
}

/** Timed checkpoint (exam/presentation/in-class) — skip 11:59 PM homework deadlines. */
export function isTimedCheckpoint(title, dueStr) {
  const t = String(title || "");
  const d = String(dueStr || "");
  if (!d || d.includes("undated")) return false;
  if (/11:59\s*PM/i.test(d)) return false;
  if (/\b(presentation|exam|final|midterm|quiz\s*\d|grading interview)\b/i.test(t)) {
    return true;
  }
  if (/\b(Advocate|People Code|Case Competition|Consider a Career)\b/i.test(t)) {
    return true;
  }
  return /\b(AM|PM)\b/i.test(d) && !/11:59/i.test(d);
}

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function parseDenverDueToLocal(isoUtc) {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    isoUtc,
  };
}

export function localStartEnd(isoStart, isoEnd) {
  const start = parseDenverDueToLocal(isoStart);
  if (!start) return null;
  let end = parseDenverDueToLocal(isoEnd);
  if (!end || end.isoUtc === start.isoUtc) {
    const d = new Date(isoStart);
    d.setMinutes(d.getMinutes() + 50);
    end = parseDenverDueToLocal(d.toISOString()) || start;
  }
  return {
    start: `${start.date}T${start.time}:00`,
    end: `${end.date}T${end.time}:00`,
  };
}

export function denverWeekday(isoUtc) {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(
    new Date(isoUtc)
  );
  return DAY_MAP[wd] || null;
}

/** Collapse Canvas section instances into recurring events where possible. */
export function collapseSectionInstances(events) {
  const groups = new Map();
  for (const e of events) {
    const title = String(e.title || "").trim();
    const key = title.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const out = [];
  for (const [key, items] of groups) {
    items.sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
    const first = items[0];
    const times = localStartEnd(first.start_at, first.end_at);
    if (!times) continue;

    const weekdays = [
      ...new Set(items.map((i) => denverWeekday(i.start_at)).filter(Boolean)),
    ].sort();
    const canvasId = first.id != null ? `canvas:cal_${first.id}` : `canvas:section:${slugify(key)}`;

    const entry = {
      id: canvasId,
      kind: "class",
      summary: String(first.title || "").trim(),
      start: times.start,
      end: times.end,
      timezone: TZ,
      location: first.location_name || first.location || "",
      source: "canvas",
      confidence: "confirmed",
      url: first.html_url || "",
      course: first.context_name || "",
    };

    if (weekdays.length >= 1 && items.length >= 2) {
      entry.recurrence = [
        `RRULE:FREQ=WEEKLY;BYDAY=${weekdays.join(",")};UNTIL=${TERM_RRULE_UNTIL}`,
      ];
      entry.id = `canvas:section:${slugify(key)}`;
    }

    out.push(entry);
  }
  return out;
}

export function fromCalendarClasses(rawEvents) {
  const sectionRows = (rawEvents || []).filter((e) => isSectionMeeting(e.title));
  return collapseSectionInstances(sectionRows);
}

/** Manual recurring class overrides from course MD + known syllabus facts. */
export function courseMdClassOverrides() {
  const overrides = [
    {
      id: "course:BCOR1030:class",
      kind: "class",
      summary: "BCOR 1030 — Communication Strategy (Sec 024)",
      start: "2026-08-26T14:00:00",
      end: "2026-08-26T15:15:00",
      timezone: TZ,
      location: "KOBL 322",
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=${TERM_RRULE_UNTIL}`],
      source: "course_md",
      confidence: "confirmed",
      url: "https://canvas.colorado.edu/courses/141523",
      course: "BCOR 1030",
    },
    {
      id: "course:APPM1235:mwf",
      kind: "class",
      summary: "APPM 1235 — Pre-Calculus (MWF lecture)",
      start: "2026-08-25T12:20:00",
      end: "2026-08-25T13:10:00",
      timezone: TZ,
      location: "CHEM 32",
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=${TERM_RRULE_UNTIL}`],
      source: "course_md",
      confidence: "confirmed",
      url: "https://canvas.colorado.edu/courses/141255",
      course: "APPM 1235",
    },
    {
      id: "course:APPM1235:recitation",
      kind: "class",
      summary: "APPM 1235 — Recitation (Thu quiz)",
      start: "2026-08-28T12:20:00",
      end: "2026-08-28T13:10:00",
      timezone: TZ,
      location: "CHEM 32",
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=TH;UNTIL=${TERM_RRULE_UNTIL}`],
      source: "course_md",
      confidence: "confirmed",
      url: "https://canvas.colorado.edu/courses/141255",
      course: "APPM 1235",
    },
    {
      id: "course:ECON2010:lecture",
      kind: "class",
      summary: "ECON 2010 — Principles of Microeconomics (Sec 100)",
      start: "2026-08-25T11:00:00",
      end: "2026-08-25T12:15:00",
      timezone: TZ,
      location: "CHEM 140",
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=${TERM_RRULE_UNTIL}`],
      source: "course_md",
      confidence: "confirmed",
      url: "https://canvas.colorado.edu/courses/138497",
      course: "ECON 2010",
    },
    {
      id: "course:ECON2010:recitation",
      kind: "class",
      summary: "ECON 2010 — Recitation (Sec 113)",
      start: "2026-08-24T16:40:00",
      end: "2026-08-24T17:30:00",
      timezone: TZ,
      location: "GUGG 3",
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=${TERM_RRULE_UNTIL}`],
      source: "course_md",
      confidence: "confirmed",
      url: "https://canvas.colorado.edu/courses/138497",
      course: "ECON 2010",
    },
    {
      id: "course:COEN1500:class",
      kind: "class",
      summary: "COEN 1500 — CEAS First-Year Seminar (Sec 868)",
      start: "2026-08-24T13:25:00",
      end: "2026-08-24T14:15:00",
      timezone: TZ,
      location: "ECES 112",
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=${TERM_RRULE_UNTIL}`],
      source: "course_md",
      confidence: "confirmed",
      url: "https://canvas.colorado.edu/courses/139021",
      course: "COEN 1500",
    },
    {
      id: "canvas:section:csci-1200-fall-26-section-800",
      kind: "class",
      summary: "CSCI 1200 — Intro Computational Thinking (Sec 800)",
      start: "2026-08-25T09:05:00",
      end: "2026-08-25T09:55:00",
      timezone: TZ,
      location: "ECCR 211",
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=MO,FR;UNTIL=${TERM_RRULE_UNTIL}`],
      source: "course_md",
      confidence: "confirmed",
      url: "https://canvas.colorado.edu/courses/138109",
      course: "CSCI 1200",
    },
    {
      id: "course:CSCI1200:wed",
      kind: "class",
      summary: "CSCI 1200 — Intro Computational Thinking (Wed lab)",
      start: "2026-08-27T09:05:00",
      end: "2026-08-27T10:45:00",
      timezone: TZ,
      location: "ECCR 211",
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=${TERM_RRULE_UNTIL}`],
      source: "course_md",
      confidence: "confirmed",
      url: "https://canvas.colorado.edu/courses/138109",
      course: "CSCI 1200",
    },
  ];
  return overrides;
}

export function parseCheckpointsFromCourseMd(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const code = path.basename(filePath, ".md");
  const events = [];
  const section = text.match(/^## Checkpoints\s*\n([\s\S]*?)(?=\n## |\n$)/m);
  if (!section) return events;

  const lineRe =
    /^- \*\*(.+?)\*\* — due (.+?); (\d+) pts/m;
  for (const line of section[1].split("\n")) {
    const m = line.match(lineRe);
    if (!m) continue;
    const [, title, dueHuman] = m;
    if (!isTimedCheckpoint(title, dueHuman)) continue;

    const startLocal = parseHumanDueLocal(dueHuman);
    if (!startLocal) continue;

    let kind = "exam";
    if (/presentation|Advocate|People Code|Case Competition|Career/i.test(title)) {
      kind = "presentation";
    } else if (/quiz/i.test(title)) {
      kind = "exam";
    }
    const durationMin = kind === "presentation" ? 75 : 60;

    events.push({
      id: `course:${code}:checkpoint:${slugify(title)}`,
      kind,
      summary: `${code} — ${title}`,
      start: startLocal,
      end: addLocalMinutes(startLocal, durationMin),
      timezone: TZ,
      location: "",
      source: "course_md",
      confidence: "confirmed",
      url: extractCanvasUrl(text),
      course: code,
    });
  }
  return events;
}

function addLocalMinutes(localStart, minutes) {
  const [datePart, timePart] = localStart.split("T");
  const [hh, mm] = timePart.split(":").map(Number);
  const total = hh * 60 + mm + minutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  let dayOffset = Math.floor(total / (24 * 60));
  if (total < 0) dayOffset -= 1;
  let endDate = datePart;
  if (dayOffset) {
    endDate = addDenverDays(datePart, dayOffset);
  }
  return `${endDate}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`;
}

function parseHumanDueLocal(human) {
  const m = String(human).match(
    /(\w{3})\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i
  );
  if (!m) return null;
  const [, mon, day, year, hour, min, ampm] = m;
  const months = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  let h = Number(hour) % 12;
  if (ampm.toUpperCase() === "PM") h += 12;
  return `${year}-${months[mon]}-${String(day).padStart(2, "0")}T${String(h).padStart(2, "0")}:${min}:00`;
}

function extractCanvasUrl(text) {
  const m = text.match(/Canvas URL:\s*(https:\/\/[^\s]+)/);
  return m ? m[1] : "";
}

export function parseManualQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  const text = fs.readFileSync(QUEUE_PATH, "utf8");
  const events = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("|") || line.includes("---") || line.includes("Added")) continue;
    const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length < 4) continue;
    const [, summary, start, end, location, notes] = cols;
    if (!summary || !start) continue;
    const meta = parseQueueNotes(notes || "");
    const event = {
      id: `${meta.kind === "club" ? "club" : "manual"}:${slugify(summary)}`,
      kind: meta.kind,
      summary,
      start: normalizeLocalDateTime(start),
      end: normalizeLocalDateTime(end || start),
      timezone: TZ,
      location: location || "",
      description: meta.description,
      source: "manual",
      confidence: "confirmed",
    };
    if (meta.recurrence?.length) event.recurrence = meta.recurrence;
    events.push(event);
  }
  return events;
}

/** Notes may include `kind:club` and/or `RRULE:...` (rest is description). */
export function parseQueueNotes(notes) {
  let kind = "manual";
  let description = String(notes || "").trim();
  const recurrence = [];

  const kindMatch = description.match(/\bkind:(club|manual|class|exam|presentation)\b/i);
  if (kindMatch) {
    kind = kindMatch[1].toLowerCase();
    description = description.replace(kindMatch[0], "").trim();
  }

  const rruleMatch = description.match(/\bRRULE:[^\s|]+/i);
  if (rruleMatch) {
    recurrence.push(rruleMatch[0].toUpperCase().startsWith("RRULE:")
      ? rruleMatch[0].replace(/^rrule:/i, "RRULE:")
      : `RRULE:${rruleMatch[0]}`);
    description = description.replace(rruleMatch[0], "").trim();
  }

  description = description.replace(/\s{2,}/g, " ").replace(/^[,;.\-\s]+|[,;.\-\s]+$/g, "");
  return { kind, description, recurrence };
}

function normalizeLocalDateTime(s) {
  const t = String(s || "").trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) return t.length === 16 ? `${t}:00` : t;
  return t;
}

export function parseConfirmedClubEvents() {
  const events = [];
  if (!fs.existsSync(SIGNUP_PREFS_PATH)) return events;

  const text = fs.readFileSync(SIGNUP_PREFS_PATH, "utf8");

  const dinner = text.match(
    /Registered:\*\*\s*CS Major Dinner 1,\s*(\d{4}-\d{2}-\d{2})\s*(\d{1,2})pm.*?event\s+(\d+)/i
  );
  if (dinner) {
    const [, date, hour, eventId] = dinner;
    const h = Number(hour);
    const startH = h >= 12 ? h : h + 12;
    events.push({
      id: `club:${eventId}`,
      kind: "club",
      summary: "COEN — Computer Science Major Dinner",
      start: `${date}T${String(startH).padStart(2, "0")}:00:00`,
      end: `${date}T${String(startH + 1).padStart(2, "0")}:00:00`,
      timezone: TZ,
      location: "Engineering Center (confirm day-of)",
      source: "coen",
      confidence: "confirmed",
      url: `https://cglink.me/2vs/r${eventId}`,
    });
  }

  const aiLab = text.match(
    /Registered:\*\*\s*AI Lab workshop,\s*(\d{4}-\d{2}-\d{2})\s*(\d{1,2})pm.*?event\s+(\d+)/i
  );
  if (aiLab) {
    const [, date, hour, eventId] = aiLab;
    const h = Number(hour);
    const startH = h >= 12 ? h : h + 12;
    events.push({
      id: `club:${eventId}`,
      kind: "club",
      summary: "COEN — AI Lab Workshop",
      start: `${date}T${String(startH).padStart(2, "0")}:00:00`,
      end: `${date}T${String(startH + 1).padStart(2, "0")}:00:00`,
      timezone: TZ,
      location: "Williams Village North, Room 186",
      source: "coen",
      confidence: "confirmed",
      url: `https://cglink.me/2vs/r${eventId}`,
    });
  }

  return events;
}

export function dedupeManifestEvents(events) {
  const byId = new Map();
  for (const e of events) {
    const prev = byId.get(e.id);
    if (!prev) {
      byId.set(e.id, e);
      continue;
    }
    if (prev.confidence === "inferred" && e.confidence === "confirmed") {
      byId.set(e.id, { ...prev, ...e });
    }
  }
  return [...byId.values()].sort((a, b) => a.start.localeCompare(b.start));
}

export function buildGapsReport(events) {
  const courses = ["CSCI1200", "BCOR1030", "APPM1235", "ECON2010", "COEN1500"];
  const withClass = new Set(
    events.filter((e) => e.kind === "class").map((e) => (e.course || e.summary || "").slice(0, 8))
  );
  return courses
    .filter((c) => ! [...withClass].some((w) => w.toUpperCase().includes(c.slice(0, 4))))
    .map((c) => ({ course: c, gap: "missing recurring class meeting in manifest" }));
}

export function hashManifest(events) {
  const payload = JSON.stringify(events.map(({ id, start, end, summary }) => ({ id, start, end, summary })));
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export async function fetchTermCalendarEvents(page) {
  const coursesRes = await apiAllPages(page, "/api/v1/courses", {
    enrollment_state: "active",
  });
  if (!coursesRes.ok) {
    throw new Error(`Courses API failed (${coursesRes.status}). Run npm run open-canvas.`);
  }
  const contextCodes = (coursesRes.items || []).map((c) => `course_${c.id}`);
  if (!contextCodes.length) return [];

  const calEvents = await apiAllPages(page, "/api/v1/calendar_events", {
    type: "event",
    start_date: TERM_START,
    end_date: TERM_END,
    "context_codes[]": contextCodes,
    all_events: "true",
  });
  if (!calEvents.ok) {
    throw new Error(`Calendar events API failed (${calEvents.status}).`);
  }
  return calEvents.items || [];
}

export function filterCanvasClassesWithOverrides(canvasClasses, overrides) {
  const overrideCourses = new Set(
    overrides
      .filter((e) => e.kind === "class")
      .map((e) => String(e.course || e.summary || "").toLowerCase())
      .filter(Boolean)
  );
  if (!overrideCourses.size) return canvasClasses;

  return canvasClasses.filter((e) => {
    const hay = `${e.summary || ""} ${e.course || ""}`.toLowerCase();
    for (const course of overrideCourses) {
      const code = course.replace(/\s+/g, "");
      if (hay.includes(course) || hay.includes(code)) return false;
    }
    return true;
  });
}

export function buildManifestFromSources({ canvasEvents = [] } = {}) {
  const overrides = courseMdClassOverrides();
  const canvasClasses = filterCanvasClassesWithOverrides(
    fromCalendarClasses(canvasEvents),
    overrides
  );
  const checkpoints = [];
  for (const entry of COURSE_FILE_MAP) {
    const fp = path.join(COURSES_DIR, `${entry.code}.md`);
    if (fs.existsSync(fp)) checkpoints.push(...parseCheckpointsFromCourseMd(fp));
  }

  const events = dedupeManifestEvents([
    ...canvasClasses,
    ...overrides,
    ...checkpoints,
    ...parseConfirmedClubEvents(),
    ...parseManualQueue(),
  ]);

  return {
    updated: denverDay(),
    timezone: TZ,
    term: { start: TERM_START, end: TERM_END },
    hash: hashManifest(events),
    gaps: buildGapsReport(events),
    events,
  };
}

export function writeManifest(manifest) {
  fs.mkdirSync(INBOX_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  return MANIFEST_PATH;
}

export function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

export function readPolicyCalendarId() {
  if (!fs.existsSync(POLICY_PATH)) return null;
  const text = fs.readFileSync(POLICY_PATH, "utf8");
  const m = text.match(/\*\*calendar_id:\*\*\s*([^\s\n_][^\n]*)/);
  if (!m) return null;
  const id = m[1].trim();
  if (!id || id.startsWith("_") || id.startsWith("(")) return null;
  return id;
}

export function writePolicyCalendarId(calendarId) {
  let text = fs.readFileSync(POLICY_PATH, "utf8");
  text = text.replace(
    /\*\*calendar_id:\*\*\s*.*/,
    `**calendar_id:** \`${calendarId}\``
  );
  fs.writeFileSync(POLICY_PATH, text);
}
