/**
 * Validate instructor profile quality in inbox/courses/*.md.
 * Used by `npm run validate-profiles` after sync.
 */
import fs from "node:fs";
import path from "node:path";
import {
  COURSES_DIR,
  COURSES_RAW_DIR,
  isSyllabusStub,
} from "./canvas-session.mjs";

const PENDING_HASH_RE = /pending/i;
const NO_SYLLABUS_HASH_RE = /^\(none\)/i;

function extractSection(body, heading) {
  const marker = `## ${heading}`;
  const idx = body.indexOf(marker);
  if (idx === -1) return "";
  const after = body.slice(idx + marker.length).replace(/^\s*\n/, "");
  const next = after.search(/\n## /);
  return (next === -1 ? after : after.slice(0, next)).trim();
}

function parseMetaField(body, field) {
  const re = new RegExp(`^${field.replace(/[()]/g, "\\$&")}:\\s*(.*)$`, "m");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

/** Extract ### subsection body from Instructor profile (or any section text). */
function extractH3(section, heading) {
  const re = new RegExp(
    `### ${heading.replace(/[()]/g, "\\$&")}\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`
  );
  return section.match(re)?.[1] || "";
}

const AI_RESTRICTION_RE =
  /acceptable\s+ai|prohibited\s+ai|no\s+ai\b|may\s+not\s+use\s+ai|forbidden.*\bai\b|not\s+permitted.*\bai\b|copying\s+off\s+of\s+ai|paste\s+prompts?\s+into\s+ai|chatgpt|copilot|claude|gemini/i;

/**
 * Agent must not paste syllabus AI allow/prohibit into profiles (Jacob-only).
 * @param {string} profileSection
 * @param {string} code
 * @returns {string[]}
 */
export function findAgentPastedAiRestrictions(profileSection, code) {
  const issues = [];
  const jacobAi = extractH3(profileSection, "AI policy (Jacob only)");
  const legacyAi = extractH3(profileSection, "AI and academic integrity");
  for (const [label, body] of [
    ["AI policy (Jacob only)", jacobAi],
    ["AI and academic integrity", legacyAi],
  ]) {
    if (!body.trim()) continue;
    if (/\(syllabus\)/i.test(body) && AI_RESTRICTION_RE.test(body)) {
      issues.push(
        `${code}: ${label} has (syllabus)-tagged AI restrictions — agent must not paste AI restrictions; Jacob only`
      );
    }
  }
  return issues;
}

function readRawSyllabus(code) {
  const rawPath = path.join(COURSES_RAW_DIR, `${code}-syllabus.txt`);
  if (!fs.existsSync(rawPath)) return { path: rawPath, text: "", exists: false };
  return {
    path: rawPath,
    text: fs.readFileSync(rawPath, "utf8"),
    exists: true,
  };
}

/**
 * @param {string} content Full course MD
 * @param {string} code Course stub code (e.g. BCOR1030)
 * @returns {{ issues: string[], warnings: string[] }}
 */
export function validateInstructorProfile(content, code) {
  const issues = [];
  const warnings = [];

  const hash = parseMetaField(content, "Syllabus hash");
  const profileSection = extractSection(content, "Instructor profile");
  const profileUpdated = profileSection.match(/Profile updated:\s*(\d{4}-\d{2}-\d{2})/);
  const isPlaceholder =
    !profileSection ||
    /Profile updated:\s*\(agent fills/i.test(profileSection) ||
    /^### Grading and weights\s*\n\s*-\s*$/m.test(profileSection);

  if (
    profileUpdated &&
    (PENDING_HASH_RE.test(hash) || !hash) &&
    !NO_SYLLABUS_HASH_RE.test(hash)
  ) {
    issues.push(
      `${code}: Profile updated ${profileUpdated[1]} but Syllabus hash is still "${hash || "(empty)"}" — run npm run sync`
    );
  }

  const raw = readRawSyllabus(code);
  if (
    !raw.exists &&
    hash &&
    !PENDING_HASH_RE.test(hash) &&
    !NO_SYLLABUS_HASH_RE.test(hash)
  ) {
    warnings.push(`${code}: Syllabus hash set but missing ${raw.path}`);
  }

  if (profileUpdated && !isPlaceholder) {
    const syllabusTags = (profileSection.match(/\(syllabus\)/gi) || []).length;
    if (syllabusTags === 0) {
      issues.push(
        `${code}: Instructor profile has no (syllabus)-tagged bullets — run jacob-instructor-profile after sync`
      );
    }

    issues.push(...findAgentPastedAiRestrictions(profileSection, code));

    const formatSection = extractH3(
      profileSection,
      "Formatting and submission habits"
    );
    if (
      formatSection &&
      syllabusTags === 0 &&
      !/(assignment:|announcement:)/i.test(profileSection)
    ) {
      warnings.push(`${code}: Profile appears catalog-inferred only`);
    }
  }

  if (isPlaceholder && hash && !PENDING_HASH_RE.test(hash)) {
    warnings.push(`${code}: Syllabus synced but instructor profile still placeholder`);
  }

  return { issues, warnings };
}

/**
 * Syllabus-first course MD quality checks (Theme, Syllabus sources, gaps vs _raw).
 * @param {string} content
 * @param {string} code
 * @returns {{ issues: string[], warnings: string[] }}
 */
export function validateCourseMd(content, code) {
  const issues = [];
  const warnings = [];

  const theme = extractSection(content, "Theme");
  const syllabusSources = extractSection(content, "Syllabus sources");
  const profileSection = extractSection(content, "Instructor profile");
  const confidence = profileSection.match(
    /### Confidence and gaps\n([\s\S]*?)(?=\n### |\n## |$)/
  )?.[1] || "";

  const raw = readRawSyllabus(code);
  const rawNonStub = raw.exists && !isSyllabusStub(raw.text);
  const themeInferredOnly =
    /\(inferred\)/i.test(theme) && !/\(syllabus\)/i.test(theme);

  if (!syllabusSources || /Last reviewed:\s*\(agent fills/i.test(syllabusSources)) {
    if (rawNonStub) {
      warnings.push(
        `${code}: Missing ## Syllabus sources — run jacob-syllabus-intake`
      );
    }
  }

  if (themeInferredOnly && rawNonStub) {
    issues.push(
      `${code}: Theme is (inferred) but non-stub _raw syllabus exists — run jacob-syllabus-intake`
    );
  }

  if (
    rawNonStub &&
    /need syllabus|need.*syllabus sync|pending sync.*syllabus/i.test(confidence)
  ) {
    warnings.push(
      `${code}: Confidence and gaps still says need syllabus though _raw is non-stub`
    );
  }

  if (rawNonStub && profileSection) {
    const syllabusTags = (profileSection.match(/\(syllabus\)/gi) || []).length;
    if (raw.text.length > 1000 && syllabusTags < 3) {
      warnings.push(
        `${code}: Profile has only ${syllabusTags} (syllabus) tag(s) but _raw is >1KB — re-run syllabus-intake`
      );
    }
  }

  return { issues, warnings };
}

export function validateAllCourseProfiles(coursesDir = COURSES_DIR) {
  const results = [];
  if (!fs.existsSync(coursesDir)) {
    return { results, issueCount: 0, warningCount: 0 };
  }

  for (const name of fs.readdirSync(coursesDir)) {
    if (!name.endsWith(".md")) continue;
    const code = path.basename(name, ".md");
    const content = fs.readFileSync(path.join(coursesDir, name), "utf8");
    const { issues, warnings } = validateInstructorProfile(content, code);
    results.push({ code, issues, warnings });
  }

  const issueCount = results.reduce((n, r) => n + r.issues.length, 0);
  const warningCount = results.reduce((n, r) => n + r.warnings.length, 0);
  return { results, issueCount, warningCount };
}

export function validateAllCourseMd(coursesDir = COURSES_DIR) {
  const results = [];
  if (!fs.existsSync(coursesDir)) {
    return { results, issueCount: 0, warningCount: 0 };
  }

  for (const name of fs.readdirSync(coursesDir)) {
    if (!name.endsWith(".md")) continue;
    const code = path.basename(name, ".md");
    const content = fs.readFileSync(path.join(coursesDir, name), "utf8");
    const profile = validateInstructorProfile(content, code);
    const course = validateCourseMd(content, code);
    results.push({
      code,
      issues: [...profile.issues, ...course.issues],
      warnings: [...profile.warnings, ...course.warnings],
    });
  }

  const issueCount = results.reduce((n, r) => n + r.issues.length, 0);
  const warningCount = results.reduce((n, r) => n + r.warnings.length, 0);
  return { results, issueCount, warningCount };
}
