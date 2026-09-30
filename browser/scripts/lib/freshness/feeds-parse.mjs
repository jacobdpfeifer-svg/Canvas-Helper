/**
 * Parsers for Canvas's tokenized feeds (Atom + iCalendar). Regex-based and
 * dependency-free: Canvas emits a small, stable subset of both formats and
 * these run without a DOM in Node and in extension service workers.
 */
import { decodeEntities } from "./actions.mjs";

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return null;
  const inner = m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1");
  return decodeEntities(inner).trim();
}

function linkHref(block) {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
  const pick = links.find((attrs) => /rel=["']alternate["']/i.test(attrs)) || links[0];
  const href = pick && pick.match(/href=["']([^"']+)["']/i);
  return href ? decodeEntities(href[1]) : null;
}

/**
 * Canvas Atom ids look like `tag:canvas.instructure.com,2026-09-29:/discussion_topics/discussion_topic_123`.
 * @returns {{ type: string|null, id: string|null }}
 */
export function atomObject(atomId) {
  const m = String(atomId || "").match(/\/([a-z_]+?)_(\d+)\s*$/i);
  return m ? { type: m[1].toLowerCase(), id: m[2] } : { type: null, id: null };
}

/** @returns {{ id, type, object_id, title, updated, published, url, html }[]} */
export function parseAtom(xml) {
  const entries = [];
  for (const m of String(xml || "").matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)) {
    const block = m[1];
    const id = tag(block, "id");
    if (!id) continue;
    const obj = atomObject(id);
    entries.push({
      id,
      type: obj.type,
      object_id: obj.id,
      title: tag(block, "title") || "",
      updated: tag(block, "updated"),
      published: tag(block, "published"),
      url: linkHref(block),
      html: tag(block, "content") || "",
    });
  }
  return entries;
}

function unfoldIcs(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function icsValue(raw) {
  return String(raw || "")
    .replace(/\\n/gi, "\n")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
}

/** `20261005T055900Z` → ISO; `20261005` → `2026-10-05`; floating local times stay raw. */
export function icsDateToIso(value, params = "") {
  const v = String(value || "").trim();
  let m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z`;
  m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (m) {
    const tz = (String(params).match(/TZID=([^;:]+)/i) || [])[1];
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${tz ? ` ${tz}` : ""}`;
  }
  return v || null;
}

/** @returns {{ uid, kind, summary, start, url }[]} */
export function parseIcs(text) {
  const events = [];
  for (const m of unfoldIcs(text).matchAll(/BEGIN:VEVENT\n([\s\S]*?)END:VEVENT/g)) {
    const fields = {};
    for (const line of m[1].split("\n")) {
      const idx = line.indexOf(":");
      if (idx <= 0) continue;
      const head = line.slice(0, idx);
      const [name, ...params] = head.split(";");
      const key = name.toUpperCase();
      if (!(key in fields)) fields[key] = { value: line.slice(idx + 1), params: params.join(";") };
    }
    const uid = icsValue(fields.UID?.value);
    if (!uid) continue;
    const kind = /assignment-override/.test(uid)
      ? "assignment_override"
      : /assignment/.test(uid)
        ? "assignment"
        : /calendar-event/.test(uid)
          ? "calendar_event"
          : "other";
    events.push({
      uid,
      kind,
      summary: icsValue(fields.SUMMARY?.value),
      start: icsDateToIso(fields.DTSTART?.value, fields.DTSTART?.params),
      url: icsValue(fields.URL?.value) || null,
    });
  }
  return events;
}
