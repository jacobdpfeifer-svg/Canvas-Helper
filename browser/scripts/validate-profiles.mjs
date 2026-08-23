/**
 * Validate instructor profile quality after sync.
 *
 * Usage: cd browser && npm run validate-profiles
 */
import { validateAllCourseProfiles } from "./lib/validate-profiles.mjs";

const { results, issueCount, warningCount } = validateAllCourseProfiles();

for (const { code, issues, warnings } of results) {
  for (const msg of issues) console.error(`ISSUE  ${msg}`);
  for (const msg of warnings) console.warn(`WARN   ${msg}`);
}

if (issueCount === 0 && warningCount === 0) {
  console.log("All instructor profiles passed validation.");
} else {
  console.log(`\n${issueCount} issue(s), ${warningCount} warning(s).`);
}

process.exit(issueCount > 0 ? 1 : 0);
