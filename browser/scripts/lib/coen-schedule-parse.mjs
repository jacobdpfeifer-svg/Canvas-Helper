/**
 * Parse CU Engineering Connections major dinner schedule HTML (public page).
 */
import { parseEventIdFromUrl } from "./campusgroups-session.mjs";

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export const ENGINEERING_DINNERS_URL =
  "https://www.colorado.edu/engineering/students/housing/engineering-connections-residential-community/engineering-connections-major-dinners";

function stripTags(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @param {string} raw e.g. "Wednesday, Aug. 26" */
export function parseCuScheduleDate(raw, year = 2026) {
  const text = String(raw || "").trim();
  const m = text.match(/([A-Za-z]+)\.?\s+(\d{1,2})/);
  if (!m) return "";
  const month = MONTHS[m[1].toLowerCase().slice(0, 4).replace(/\.$/, "")] || MONTHS[m[1].toLowerCase().slice(0, 3)];
  if (!month) return "";
  const day = m[2].padStart(2, "0");
  return `${year}-${String(month).padStart(2, "0")}-${day}`;
}

/**
 * @param {string} html
 * @param {{ year?: number }} [options]
 * @returns {Array<{ date: string, slot: string, major: string, rsvpId: string, cglink: string }>}
 */
export function parseEngineeringDinnersHtml(html, { year = 2026 } = {}) {
  const rows = [];
  const tbodyMatch = String(html || "").match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return rows;

  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(tbodyMatch[1])) !== null) {
    const tds = [...trMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (tds.length < 3) continue;

    const date = parseCuScheduleDate(stripTags(tds[0]), year);
    const majorParts = [...tds[1].matchAll(/Dinner\s+([AB]):\s*([^<\n]+)/gi)].map((m) => ({
      slot: m[1].toUpperCase(),
      major: m[2].trim().replace(/\s+/g, " "),
    }));
    const links = [...tds[2].matchAll(/href="(https:\/\/cglink\.me[^"]+)"/gi)].map((m) => m[1]);

    for (let i = 0; i < links.length; i++) {
      const cglink = links[i];
      const rsvpId = parseEventIdFromUrl(cglink);
      if (!rsvpId) continue;
      const part = majorParts[i] || { slot: links.length === 1 ? "A" : i === 0 ? "A" : "B", major: "Unknown" };
      rows.push({
        date,
        slot: part.slot,
        major: part.major,
        rsvpId,
        cglink,
      });
    }
  }

  const seen = new Set();
  return rows.filter((r) => {
    if (seen.has(r.rsvpId)) return false;
    seen.add(r.rsvpId);
    return true;
  });
}
