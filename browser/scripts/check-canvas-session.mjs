/**
 * Silent, headless check for an existing Canvas session in browser/.auth.
 * Used by onboarding to skip the sign-in prompt when SSO cookies are
 * already valid — never opens a visible window, never prompts for login.
 *
 * Prints {"loggedIn": true|false} as JSON and always exits 0 (a missing
 * or expired session is a normal result, not a script failure).
 */
import { launchCanvasContext, requireLoggedIn } from "./lib/canvas-session.mjs";

const { context, page } = await launchCanvasContext({ headless: true });
let loggedIn = false;
try {
  await requireLoggedIn(page);
  loggedIn = true;
} catch {
  loggedIn = false;
}

console.log(JSON.stringify({ loggedIn }));
await context.close();
process.exit(0);
