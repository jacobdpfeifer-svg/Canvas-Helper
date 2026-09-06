/**
 * Open Google Calendar in real Chrome (CDP) for one-time login + verification.
 * Separate profile: browser/.auth-google (not Canvas .auth).
 */
import {
  CALENDAR_URL,
  CDP_URL,
  GOOGLE_AUTH_DIR,
  isCdpReady,
  launchChromeWithCdp,
  waitForCdp,
  connectGoogleCalendar,
  verifyGoogleCalendarSession,
} from "./lib/google-calendar-session.mjs";

const already = await isCdpReady();
if (!already) {
  console.log(`Launching Chrome with profile ${GOOGLE_AUTH_DIR}…`);
  launchChromeWithCdp();
  const ready = await waitForCdp();
  if (!ready) {
    console.error(`CDP did not become ready at ${CDP_URL}`);
    process.exit(1);
  }
}

try {
  const { browser, page } = await connectGoogleCalendar();
  const check = await verifyGoogleCalendarSession(page);
  console.log(`
Google Calendar CDP session ready.
- Profile: ${GOOGLE_AUTH_DIR}
- CDP: ${CDP_URL}
- URL: ${check.url}

If not logged in: complete Google sign-in in the Chrome window, then re-run this script.
Use for visual verification only — bulk writes go through Composio API (npm run sync-calendar -- --apply).
`);
  await browser.close();
} catch (e) {
  console.log(`
Opened Chrome at ${CALENDAR_URL}
1. Log into Google if prompted (use dedicated automation profile, not daily Chrome).
2. Confirm Calendar loads.
3. Re-run: npm run open-google-calendar

Note: ${String(e.message || e)}
`);
}

process.exit(0);
