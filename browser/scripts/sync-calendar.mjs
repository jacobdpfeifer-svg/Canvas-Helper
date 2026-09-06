/**
 * Curated school schedule → inbox/calendar-manifest.json → Google Calendar (Composio).
 *
 * Usage:
 *   npm run sync-calendar                    # rebuild manifest + dry-run diff
 *   npm run sync-calendar -- --dry-run       # explicit dry-run
 *   npm run sync-calendar -- --apply         # push to Google (requires Composio)
 *   npm run sync-calendar -- --setup-calendar  # create subcalendar then exit
 *   npm run sync-calendar -- --setup-calendar --apply  # create + push creates/updates
 *   npm run sync-calendar -- --manifest-only   # skip Canvas fetch (use existing inbox)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildManifestFromSources,
  fetchTermCalendarEvents,
  writeManifest,
  MANIFEST_PATH,
} from "./lib/calendar-manifest.mjs";
import {
  applyDiff,
  diffManifest,
  formatDiffReport,
  readCalendarIdFromPolicy,
  setupSubcalendar,
} from "./lib/google-calendar-sync.mjs";
import { launchCanvasContext, requireLoggedIn } from "./lib/canvas-session.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const dryRun = args.has("--dry-run") || !apply;
const setupCalendar = args.has("--setup-calendar");
const manifestOnly = args.has("--manifest-only");

async function rebuildManifest() {
  let canvasEvents = [];
  if (!manifestOnly) {
    const { context, page } = await launchCanvasContext();
    try {
      await requireLoggedIn(page);
      console.log("Fetching term calendar events from Canvas…");
      canvasEvents = await fetchTermCalendarEvents(page);
      console.log(`Canvas calendar_events (type=event): ${canvasEvents.length}`);
    } finally {
      await context.close();
    }
  }

  const manifest = buildManifestFromSources({ canvasEvents });
  writeManifest(manifest);
  console.log(`Wrote ${MANIFEST_PATH} (${manifest.events.length} events, hash ${manifest.hash})`);
  return manifest;
}

async function main() {
  if (setupCalendar) {
    console.log("Setting up CU Fall 2026 subcalendar via Composio…");
    const calendarId = await setupSubcalendar("CU Fall 2026");
    console.log(`Subcalendar ready: ${calendarId}`);
    console.log("Saved to .jacob/calendar-policy.md");
    // Setup-only: exit unless also applying (or rebuilding with --manifest-only / explicit --dry-run after setup is rare — use a second invoke).
    if (!apply) {
      console.log("Setup complete. Re-run without --setup-calendar (or with --apply) to sync events.");
      process.exit(0);
    }
  }

  const manifest = await rebuildManifest();
  const diff = diffManifest(manifest);
  const report = formatDiffReport(diff, manifest);
  console.log("\n" + report);

  const reportPath = path.join(path.dirname(MANIFEST_PATH), "calendar-sync-diff.md");
  fs.writeFileSync(reportPath, `${report}\n`);
  console.log(`Diff written: ${reportPath}`);

  if (dryRun && !apply) {
    console.log("\nDry-run only. Use --apply to push to Google Calendar (Composio OAuth required).");
    process.exit(0);
  }

  let calendarId = readCalendarIdFromPolicy();
  if (!calendarId) {
    console.log("No calendar_id in policy — running --setup-calendar…");
    calendarId = await setupSubcalendar("CU Fall 2026");
  }

  if (!diff.creates.length && !diff.updates.length) {
    console.log("Nothing to apply.");
    process.exit(0);
  }

  console.log(`Applying to calendar ${calendarId}…`);
  const state = await applyDiff(manifest, diff, calendarId);
  console.log(`Applied. Mappings: ${Object.keys(state.mappings || {}).length}. State: inbox/courses/_raw/google-calendar-sync-state.json`);
}

main().catch((e) => {
  console.error(String(e.message || e));
  if (/COMPOSIO_API_KEY|OAuth|connection/i.test(String(e.message))) {
    console.error(`
Connect Google Calendar:
1. In Cursor chat, ask agent to connect Composio googlecalendar (OAuth link).
2. Or set COMPOSIO_API_KEY in .env for CLI --apply.
3. Then: npm run sync-calendar -- --setup-calendar --apply
`);
  }
  process.exit(1);
});
