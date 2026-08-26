/**
 * Syllabus-first course MD validation (Theme, Syllabus sources, gaps vs _raw).
 *
 * Usage: cd browser && npm run validate-course-md
 */
import { validateAllCourseMd } from "./lib/validate-profiles.mjs";

const { results, issueCount, warningCount } = validateAllCourseMd();

for (const { code, issues, warnings } of results) {
  for (const msg of issues) console.error(`ISSUE  ${msg}`);
  for (const msg of warnings) console.warn(`WARN   ${msg}`);
}

if (issueCount === 0 && warningCount === 0) {
  console.log("All course MD files passed syllabus-first validation.");
} else {
  console.log(`\n${issueCount} issue(s), ${warningCount} warning(s).`);
}

process.exit(issueCount > 0 ? 1 : 0);
