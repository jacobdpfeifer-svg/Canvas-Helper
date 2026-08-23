/**
 * Validate instructor profile quality in inbox/courses/*.md.
 * Used by `npm run validate-profiles` after sync.
 */
import fs from "node:fs";
import path from "node:path";
import { COURSES_DIR, COURSES_RAW_DIR } from "./canvas-session.mjs";

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

function parseSyncedAgentPolicy(policyNotes) {
  const head = String(policyNotes || "").split(/Instructor may add/i)[0];
  if (/agent_writes:\s*allow\s*\(synced/i.test(head)) return "allow";
  if (/agent_writes:\s*deny\s*\(synced/i.test(head)) return "deny";
  if (/agent_writes:\s*conflict/i.test(head)) return "conflict";
  return "none";
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

  const rawPath = path.join(COURSES_RAW_DIR, `${code}-syllabus.txt`);
  if (
    !fs.existsSync(rawPath) &&
    hash &&
    !PENDING_HASH_RE.test(hash) &&
    !NO_SYLLABUS_HASH_RE.test(hash)
  ) {
    warnings.push(`${code}: Syllabus hash set but missing ${rawPath}`);
  }

  if (profileUpdated && !isPlaceholder) {
    const syllabusTags = (profileSection.match(/\(syllabus\)/gi) || []).length;
    if (syllabusTags === 0) {
      issues.push(
        `${code}: Instructor profile has no (syllabus)-tagged bullets — run jacob-instructor-profile after sync`
      );
    }

    const aiSection = profileSection.match(
      /### AI and academic integrity\n([\s\S]*?)(?=\n### |\n## |$)/
    )?.[1];
    const formatSection = profileSection.match(
      /### Formatting and submission habits\n([\s\S]*?)(?=\n### |\n## |$)/
    )?.[1];
    const policyNotes = extractSection(content, "Syllabus / agent policy notes");
    const syncedPolicy = parseSyncedAgentPolicy(policyNotes);
    if (
      aiSection &&
      /no ai|prohibited|forbidden|not permitted|may not use ai/i.test(aiSection) &&
      syncedPolicy === "allow"
    ) {
      issues.push(
        `${code}: Profile AI section conflicts with synced agent_writes: allow — resolve before auto-submit`
      );
    }
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
