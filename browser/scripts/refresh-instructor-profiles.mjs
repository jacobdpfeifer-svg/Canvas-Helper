/**
 * Post-sync helper: stamp profile Sources with syllabus hash from course header
 * and flag courses that need a full jacob-instructor-profile rebuild.
 *
 * Usage: cd browser && npm run sync && npm run refresh-profiles
 */
import fs from "node:fs";
import path from "node:path";
import {
  COURSES_DIR,
  COURSES_RAW_DIR,
  denverDay,
} from "./lib/canvas-session.mjs";
import { validateInstructorProfile } from "./lib/validate-profiles.mjs";

function parseMetaField(body, field) {
  const re = new RegExp(`^${field.replace(/[()]/g, "\\$&")}:\\s*(.*)$`, "m");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

function updateSourcesLine(content, hash, today) {
  const sourcesMarker = "### Sources\n";
  const idx = content.indexOf(sourcesMarker);
  if (idx === -1) return content;

  const after = content.slice(idx + sourcesMarker.length);
  const next = after.search(/\n### |\n## /);
  const sourcesBody = (next === -1 ? after : after.slice(0, next)).trim();
  const syllabusLine = `- Canvas syllabus (synced ${today}, hash ${hash})`;

  let newSources;
  if (/Canvas syllabus \(synced/i.test(sourcesBody)) {
    newSources = sourcesBody.replace(
      /- Canvas syllabus \(synced[^\n]*/i,
      syllabusLine
    );
  } else if (/Syllabus: pending sync/i.test(sourcesBody)) {
    newSources = sourcesBody.replace(/- Syllabus: pending sync/i, syllabusLine);
  } else {
    newSources = `${syllabusLine}\n${sourcesBody}`.trim();
  }

  const tail = next === -1 ? "" : after.slice(next);
  return (
    content.slice(0, idx + sourcesMarker.length) +
    newSources +
    "\n" +
    tail
  );
}

const today = denverDay();
let updated = 0;
const needsRebuild = [];

for (const name of fs.readdirSync(COURSES_DIR)) {
  if (!name.endsWith(".md")) continue;
  const code = path.basename(name, ".md");
  const filePath = path.join(COURSES_DIR, name);
  let content = fs.readFileSync(filePath, "utf8");
  const hash = parseMetaField(content, "Syllabus hash");
  const rawPath = path.join(COURSES_RAW_DIR, `${code}-syllabus.txt`);

  if (!hash || /pending/i.test(hash) || !fs.existsSync(rawPath)) {
    needsRebuild.push(code);
    continue;
  }

  const next = updateSourcesLine(content, hash, today);
  if (next !== content) {
    fs.writeFileSync(filePath, next, "utf8");
    updated += 1;
    content = next;
  }

  const { issues } = validateInstructorProfile(content, code);
  if (issues.some((i) => i.includes("(syllabus)-tagged"))) {
    needsRebuild.push(code);
  }
}

console.log(`Updated Sources in ${updated} course file(s).`);
if (needsRebuild.length) {
  console.log(
    `Run jacob-instructor-profile for: ${[...new Set(needsRebuild)].join(", ")}`
  );
}
