/**
 * Open Canvas headed so Jacob can complete IdentiKey + MFA.
 * Reuses browser/.auth for later npm run sync.
 */
import { BASE, launchCanvasContext } from "./lib/canvas-session.mjs";

const { context, page } = await launchCanvasContext();
await page.goto(BASE, { waitUntil: "domcontentloaded" });

console.log(`
Opened Canvas in a headed browser.
1. Complete IdentiKey + MFA if prompted.
2. Confirm you see your dashboard.
3. Close the browser window when done (session kept in browser/.auth/).
4. Then: npm run sync
`);

context.on("close", () => process.exit(0));
