/**
 * RSVP to a COEN AI Lab workshop slot.
 * Reads .jacob/signup-preferences.md and inbox/coen-ai-labs.md.
 *
 * Usage:
 *   npm run rsvp-ai-lab -- --slot "Wed 2pm"
 *   HEADLESS=1 npm run rsvp-ai-lab -- --event 123456 --log
 *
 * Requires AI Lab preference confirmed in .jacob/signup-preferences.md unless --event given.
 */
import fs from "node:fs";
import {
  COEN_AI_LABS_PATH,
  SIGNUP_PREFS_PATH,
  appendRegistrationLog,
  ensureCampusGroupsSession,
  launchCanvasContext,
  performRsvp,
  verifyRsvp,
} from "./lib/campusgroups-session.mjs";

function parseArgs(argv) {
  const args = { slot: null, event: null, verify: true, name: "Jacob Pfeifer", log: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slot" && argv[i + 1]) args.slot = argv[++i];
    else if (a === "--event" && argv[i + 1]) args.event = argv[++i];
    else if (a === "--name" && argv[i + 1]) args.name = argv[++i];
    else if (a === "--no-verify") args.verify = false;
    else if (a === "--no-log") args.log = false;
    else if (a === "--headed") process.env.HEADLESS = "0";
  }
  return args;
}

function parseAiLabPreferences(md) {
  const prefs = { status: "unconfirmed", preferredSlot: "" };
  const block = String(md || "").match(/## AI Lab workshop[\s\S]*?(?=##|$)/i);
  if (!block) return prefs;
  const status = block[0].match(/\*\*Status:\*\*\s*(\w+)/i);
  if (status) prefs.status = status[1].toLowerCase();
  const slot = block[0].match(/\*\*Preferred slot:\*\*\s*(.+)/i);
  if (slot) prefs.preferredSlot = slot[1].trim();
  return prefs;
}

function parseAiLabsTable(md) {
  const rows = [];
  for (const line of String(md || "").split("\n")) {
    if (!line.startsWith("|") || /^\|\s*Date\s*\|/i.test(line) || /^[-| ]+$/.test(line)) continue;
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, a) => i > 0 && i < a.length - 1);
    if (cols.length < 5) continue;
    const [date, time, workshop, rsvpId, cglink] = cols;
    if (!rsvpId || !/^\d+$/.test(rsvpId)) continue;
    rows.push({ date, time, workshop, rsvpId, cglink });
  }
  return rows;
}

function resolveAiLabRow({ slot, event, prefs }) {
  if (event) return { rsvpId: String(event), label: `AI Lab event ${event}` };

  let md = "";
  try {
    md = fs.readFileSync(COEN_AI_LABS_PATH, "utf8");
  } catch {
    throw new Error(`Missing ${COEN_AI_LABS_PATH} — run: cd browser && npm run sync-ai-labs`);
  }

  const rows = parseAiLabsTable(md);
  if (!rows.length) {
    throw new Error("No AI lab rows in coen-ai-labs.md — run npm run sync-ai-labs");
  }

  const needle = (slot || prefs.preferredSlot || "").toLowerCase();
  if (!needle) {
    throw new Error(
      "No workshop slot specified — ask Jacob, set Preferred slot in .jacob/signup-preferences.md, or pass --slot / --event"
    );
  }

  const match = rows.find(
    (r) =>
      `${r.date} ${r.time} ${r.workshop}`.toLowerCase().includes(needle) ||
      r.workshop.toLowerCase().includes(needle) ||
      r.time.toLowerCase().includes(needle)
  );
  if (!match) {
    throw new Error(`No AI lab row matches slot="${needle}" — check inbox/coen-ai-labs.md`);
  }
  return {
    rsvpId: match.rsvpId,
    label: `AI Lab ${match.date} ${match.time} — ${match.workshop}`,
  };
}

const args = parseArgs(process.argv);

let prefs = { status: "unconfirmed", preferredSlot: "" };
try {
  prefs = parseAiLabPreferences(fs.readFileSync(SIGNUP_PREFS_PATH, "utf8"));
} catch {
  console.warn("Warning: .jacob/signup-preferences.md not found");
}

if (!args.event && prefs.status !== "confirmed") {
  console.error(
    "AI Lab preference not confirmed — ask Jacob for workshop slot, then set Status: confirmed and Preferred slot in .jacob/signup-preferences.md"
  );
  process.exit(1);
}

let row;
try {
  row = resolveAiLabRow({ slot: args.slot, event: args.event, prefs });
} catch (e) {
  console.error(String(e.message || e));
  process.exit(1);
}

const { context, page } = await launchCanvasContext();
let result;

try {
  await ensureCampusGroupsSession(page);
  const rsvpResult = await performRsvp(page, row.rsvpId);

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
    alreadyRegistered: rsvpResult.alreadyRegistered || false,
    verification,
    url: page.url(),
    calendarReminder:
      "Optional: agent may create Google Calendar event via Google Calendar MCP after Jacob confirms slot",
  };

  if (result.ok && args.log) {
    appendRegistrationLog({
      major: "",
      date: "",
      eventId: row.rsvpId,
      label: row.label,
    });
  }
} catch (e) {
  result = { ok: false, eventId: row.rsvpId, error: String(e.message || e) };
} finally {
  await context.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
