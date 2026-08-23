/**
 * RSVP to a CampusGroups event via Playwright (shared .auth SSO).
 *
 * Usage:
 *   npm run rsvp-campusgroups -- --event 385793
 *   HEADLESS=1 npm run rsvp-campusgroups -- --event 385793 --verify
 *   npm run rsvp-campusgroups -- --event 385793 --name "Jacob Pfeifer"
 */
import {
  appendRegistrationLog,
  ensureCampusGroupsSession,
  launchCanvasContext,
  performRsvp,
  verifyRsvp,
} from "./lib/campusgroups-session.mjs";

function parseArgs(argv) {
  const args = { event: null, verify: true, name: "Jacob Pfeifer", log: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--event" && argv[i + 1]) args.event = argv[++i];
    else if (a === "--name" && argv[i + 1]) args.name = argv[++i];
    else if (a === "--verify") args.verify = true;
    else if (a === "--no-verify") args.verify = false;
    else if (a === "--log") args.log = true;
    else if (a === "--headed") process.env.HEADLESS = "0";
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.event) {
  console.error("Usage: npm run rsvp-campusgroups -- --event <id> [--name \"Jacob Pfeifer\"] [--verify] [--log]");
  process.exit(1);
}

const { context, page } = await launchCanvasContext();
let result;

try {
  await ensureCampusGroupsSession(page);
  const rsvpResult = await performRsvp(page, args.event);

  if (args.verify) {
    const verification = await verifyRsvp(page, {
      eventId: args.event,
      studentName: args.name,
    });
    result = {
      ok: verification.success,
      eventId: String(args.event),
      alreadyRegistered: rsvpResult.alreadyRegistered || false,
      verification,
      url: page.url(),
    };
  } else {
    result = {
      ok: true,
      eventId: String(args.event),
      alreadyRegistered: rsvpResult.alreadyRegistered || false,
      verification: { success: null, method: "skipped" },
      url: page.url(),
    };
  }

  if (result.ok && args.log) {
    appendRegistrationLog({
      major: "",
      date: "",
      eventId: args.event,
      label: `CampusGroups event ${args.event}`,
    });
  }
} catch (e) {
  result = { ok: false, eventId: String(args.event), error: String(e.message || e) };
} finally {
  await context.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
