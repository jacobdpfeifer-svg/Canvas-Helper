/**
 * RSVP to a COEN major dinner by major alias + date.
 * Reads {user_root}/calibration/signup-preferences.md and inbox/coen-major-dinners.md.
 *
 * Usage:
 *   npm run rsvp-dinner -- --major cs --date 2026-08-26 --name "Student Name" --confirm
 *   HEADLESS=1 npm run rsvp-dinner -- --major cs --date 2026-08-26 --name "Student Name" --confirm --log
 *
 * Set DEV_USER_ROOT to point at the product user root (calibration + inbox).
 * --confirm is required: RSVP is visible to the event organizer (pivot exception
 * for this CLI escape hatch only — not an MCP tool).
 */
import fs from "node:fs";
import {
  COEN_MAJOR_DINNERS_PATH,
  SIGNUP_PREFS_PATH,
  appendRegistrationLog,
  ensureCampusGroupsSession,
  launchCanvasContext,
  majorMatches,
  parseMajorDinnersTable,
  parseSignupPreferences,
  performRsvp,
  verifyRsvp,
} from "./campusgroups-session.mjs";

function parseArgs(argv) {
  const args = { major: null, date: null, verify: true, name: "", log: true, confirm: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--major" && argv[i + 1]) args.major = argv[++i];
    else if (a === "--date" && argv[i + 1]) args.date = argv[++i];
    else if (a === "--name" && argv[i + 1]) args.name = argv[++i];
    else if (a === "--no-verify") args.verify = false;
    else if (a === "--no-log") args.log = false;
    else if (a === "--confirm") args.confirm = true;
    else if (a === "--headed") process.env.HEADLESS = "0";
  }
  return args;
}

function resolveDinnerRow({ major, date, prefs }) {
  let md = "";
  try {
    md = fs.readFileSync(COEN_MAJOR_DINNERS_PATH, "utf8");
  } catch {
    throw new Error(
      `Missing ${COEN_MAJOR_DINNERS_PATH} — run: cd browser && npm run sync-dinners`
    );
  }

  const rows = parseMajorDinnersTable(md);
  if (!rows.length) {
    throw new Error("No dinner rows in coen-major-dinners.md — run npm run sync-dinners");
  }

  const majorAlias = major || prefs.majorDinnerDefault;
  let candidates = rows.filter((r) => majorMatches(r.major, majorAlias));
  if (date) {
    candidates = candidates.filter((r) => r.date === date || r.date.startsWith(date));
  }
  if (!candidates.length) {
    throw new Error(
      `No dinner row for major=${majorAlias} date=${date || "any"} — check inbox/coen-major-dinners.md`
    );
  }
  return candidates[0];
}

const args = parseArgs(process.argv);
if (!args.name.trim()) {
  console.error(
    'Usage: npm run rsvp-dinner -- --name "Student Name" --confirm [--major ...] [--date ...]'
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

let prefs = { majorDinnerDefault: "Computer Science", majorDinnerStatus: "unconfirmed" };
try {
  prefs = parseSignupPreferences(fs.readFileSync(SIGNUP_PREFS_PATH, "utf8"));
} catch {
  console.warn(`Warning: ${SIGNUP_PREFS_PATH} not found — using defaults`);
}

if (!args.major) {
  if (prefs.majorDinnerStatus !== "confirmed") {
    console.error(
      "Major dinner preference not confirmed — set Status: confirmed in calibration/signup-preferences.md"
    );
    console.error(`Default would be: ${prefs.majorDinnerDefault}`);
    process.exit(1);
  }
  args.major = prefs.majorDinnerDefault;
}

let row;
try {
  row = resolveDinnerRow({ major: args.major, date: args.date, prefs });
} catch (e) {
  console.error(String(e.message || e));
  process.exit(1);
}

const { context, page } = await launchCanvasContext();
let result;

try {
  await ensureCampusGroupsSession(page);
  const rsvpResult = await performRsvp(page, row.rsvpId, { confirmed: true });

  let verification = { success: false, method: "none" };
  if (args.verify) {
    verification = await verifyRsvp(page, {
      eventId: row.rsvpId,
      studentName: args.name,
    });
  } else {
    verification = { success: true, method: "skipped" };
  }

  result = {
    ok: verification.success,
    eventId: row.rsvpId,
    major: row.major,
    date: row.date,
    slot: row.slot,
    alreadyRegistered: rsvpResult.alreadyRegistered || false,
    verification,
    url: page.url(),
  };

  if (result.ok && args.log) {
    appendRegistrationLog({
      major: row.major,
      date: row.date,
      eventId: row.rsvpId,
      slot: row.slot,
      label: `${row.major} ${row.date} slot ${row.slot}`,
    });
  }
} catch (e) {
  result = { ok: false, eventId: row.rsvpId, error: String(e.message || e) };
} finally {
  await context.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
