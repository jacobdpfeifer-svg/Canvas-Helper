/**
 * Load school registry config for browser SSO scripts.
 * Reads schools/{slug}.yaml (SCHOOL_SLUG env, default cu-boulder).
 * Prefer SCHOOLS_DIR override for tests.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

function schoolsDir() {
  return process.env.SCHOOLS_DIR || path.join(REPO_ROOT, "schools");
}

/** Minimal YAML subset parser for our school files (no nested lists of maps beyond course_file_map). */
function parseSchoolYaml(text) {
  const lines = text.split(/\r?\n/);
  const out = {
    slug: "",
    display_name: "",
    canvas_base_url: "",
    sso_idp: "",
    timezone: "UTC",
    term_dates: {},
    lti_catalog: [],
    engagement_platform: null,
    course_file_map: [],
  };
  let section = null;
  let currentMap = null;
  let engagement = null;

  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const indent = raw.match(/^ */)[0].length;
    const line = raw.trim();

    if (indent === 0 && line.endsWith(":") && !line.includes(" ")) {
      section = line.slice(0, -1);
      currentMap = null;
      if (section === "engagement_platform") engagement = {};
      if (section === "course_file_map") out.course_file_map = [];
      if (section === "term_dates") out.term_dates = {};
      if (section === "lti_catalog") out.lti_catalog = [];
      continue;
    }

    if (section === "course_file_map" && line.startsWith("- code:")) {
      currentMap = { code: line.replace("- code:", "").trim(), patterns: [] };
      out.course_file_map.push(currentMap);
      continue;
    }
    if (section === "course_file_map" && currentMap && line.startsWith("patterns:")) {
      continue;
    }
    if (section === "course_file_map" && currentMap && line.startsWith("- ")) {
      const pat = line.slice(2).replace(/^["']|["']$/g, "");
      currentMap.patterns.push(pat);
      continue;
    }

    if (section === "lti_catalog" && line.startsWith("- ")) {
      out.lti_catalog.push(line.slice(2).trim());
      continue;
    }

    if (section === "term_dates" && line.includes(":")) {
      const [k, ...rest] = line.split(":");
      out.term_dates[k.trim()] = rest.join(":").trim().replace(/^["']|["']$/g, "");
      continue;
    }

    if (section === "engagement_platform" && engagement && line.includes(":")) {
      const [k, ...rest] = line.split(":");
      const v = rest.join(":").trim().replace(/^["']|["']$/g, "");
      if (v === "null") engagement[k.trim()] = null;
      else engagement[k.trim()] = v;
      continue;
    }

    if (indent === 0 && line.includes(":")) {
      section = null;
      const [k, ...rest] = line.split(":");
      const key = k.trim();
      let v = rest.join(":").trim().replace(/^["']|["']$/g, "");
      if (v === "null") v = null;
      out[key] = v;
    }
  }
  if (engagement && engagement.host) out.engagement_platform = engagement;
  return out;
}

let _cached = null;

export function getSchoolSlug() {
  return (process.env.SCHOOL_SLUG || "cu-boulder").trim();
}

export function getSchoolConfig(slug = getSchoolSlug()) {
  if (_cached && _cached.slug === slug) return _cached;
  const file = path.join(schoolsDir(), `${slug}.yaml`);
  if (!fs.existsSync(file)) {
    throw new Error(`Unknown school slug: ${slug} (${file})`);
  }
  const raw = parseSchoolYaml(fs.readFileSync(file, "utf8"));
  if (!raw.canvas_base_url) {
    throw new Error(`School config missing canvas_base_url: ${file}`);
  }
  raw.canvas_base_url = String(raw.canvas_base_url).replace(/\/$/, "");
  raw.course_file_map = (raw.course_file_map || []).map((e) => ({
    code: e.code,
    patterns: (e.patterns || []).map((p) => new RegExp(p, "i")),
  }));
  _cached = raw;
  return raw;
}

export function clearSchoolConfigCache() {
  _cached = null;
}

export function schoolDay(d = new Date(), timezone) {
  const tz = timezone || getSchoolConfig().timezone || "UTC";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
