/**
 * RSVP to a CampusGroups event via Playwright (shared .auth SSO).
 *
 * Usage:
 *   npm run rsvp-campusgroups -- --event 385793 --name "Student Name" --confirm
 *   HEADLESS=1 npm run rsvp-campusgroups -- --event 385793 --name "Student Name" --confirm --verify
 *
 * Student-operated escape hatch (plugins/README.md): RSVPing is visible to the
 * event organizer, so --confirm must be passed explicitly by whoever runs this
 * — it is not inferred from --event/--name alone, so an agent cannot fire it
 * on the student's behalf without a deliberate, extra signal from the student.
 */
import {
  appendRegistrationLog,
  ensureCampusGroupsSession,
  launchCanvasContext,
  performRsvp,
  verifyRsvp,
} from "./campusgroups-session.mjs";

function parseArgs(argv) {
  const args = { event: null, verify: true, name: "", log: false, confirm: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--event" && argv[i + 1]) args.event = argv[++i];
    else if (a === "--name" && argv[i + 1]) args.name = argv[++i];
    else if (a === "--verify") args.verify = true;
    else if (a === "--no-verify") args.verify = false;
    else if (a === "--log") args.log = true;
    else if (a === "--confirm") args.confirm = true;
    else if (a === "--headed") process.env.HEADLESS = "0";
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.event || !args.name.trim()) {
  console.error(
    'Usage: npm run rsvp-campusgroups -- --event <id> --name "Student Name" --confirm [--verify] [--log]'
  );
  process.exit(1);
}
if (!args.confirm) {
  console.error(
    "Refusing to RSVP without --confirm: this registers you with the event organizer. " +
      "Pass --confirm only after you've decided to attend."
  );
  process.exit(1);
}

const { context, page } = await launchCanvasContext();
let result;

try {
  await ensureCampusGroupsSession(page);
  const rsvpResult = await performRsvp(page, args.event, { confirmed: true });

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
