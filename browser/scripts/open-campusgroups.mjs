/**
 * Open CampusGroups headed so Jacob can complete Shibboleth + consent/onboarding once per term.
 * Reuses browser/.auth (same profile as Canvas sync).
 */
import { CG_BASE, ensureCampusGroupsSession, launchCanvasContext } from "./lib/campusgroups-session.mjs";

const { context, page } = await launchCanvasContext();

console.log(`
Opening CampusGroups in a headed browser (shared browser/.auth profile).
1. Complete IdentiKey + MFA if prompted.
2. Accept information release / consent if shown.
3. Skip or complete onboarding if shown.
4. Confirm you see CampusGroups home or events.
5. Close the browser window when done.
6. Then: HEADLESS=1 npm run rsvp-campusgroups -- --event <id>
`);

try {
  await ensureCampusGroupsSession(page, { targetUrl: `${CG_BASE}/home` });
  console.log(`Logged in at: ${page.url()}`);
} catch (e) {
  console.log(`Session not ready yet — complete login in the browser window.\n${e.message}`);
}

context.on("close", () => process.exit(0));
