/**
 * Open a persistent Chrome window for WebAssign (CDP port 9223, browser/.auth).
 * Leave the window open — npm run webassign reuses it without Canvas SSO.
 */
import {
  acquireWebAssignPage,
  readSessionState,
  releaseWebAssignBrowser,
} from "./lib/webassign/browser-session.mjs";

const assignment =
  process.argv.find((a) => a.startsWith("http")) ||
  "https://canvas.colorado.edu/courses/141255/assignments/2754105";

const savedWa =
  readSessionState().waUrl ||
  "https://www.webassign.net/web/Student/Assignment-Responses/last?dep=39902084";

console.log(`
WebAssign persistent session
  assignment: ${assignment}
  CDP port:   9224 (WEBASSIGN_CDP_PORT)
  profile:    browser/.auth-webassign

Leave Chrome open. Then run:
  cd browser && npm run webassign -- --all-open
`);

const { browser, wa, meta } = await acquireWebAssignPage({
  assignmentUrl: assignment,
  waUrl: savedWa,
  titleRe: /WA\s*10/i,
  log: null,
  launchIfNeeded: true,
});

console.log("\nReady:", meta.title, meta.url);
console.log("WebAssign tab is live — do not close Chrome between npm run webassign calls.");

await releaseWebAssignBrowser(browser, { close: false });
