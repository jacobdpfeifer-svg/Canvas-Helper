/**
 * Voice goal-capture interviewer (local): mic → Gemini Live → inbox/goals.md,
 * inbox/courses/*.md `## Class notes`, and a gitignored transcript.
 *
 * Usage: cd browser && npm run voice   →  open the printed localhost URL
 * Setup + design: docs/VOICE.md
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRepoEnv, readVoiceConfig, voicePaths } from "./lib/voice/config.mjs";
import { createLiveConnector } from "./lib/voice/live.mjs";
import { createVoiceServer } from "./lib/voice/server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadRepoEnv();
const config = readVoiceConfig();

if (!config.apiKey) {
  console.error(
    "Missing GEMINI_API_KEY. Create a key at https://aistudio.google.com/apikey and add\n  GEMINI_API_KEY=...\nto the repo-root .env (gitignored). See docs/VOICE.md.",
  );
  process.exit(1);
}

const paths = voicePaths();
const app = createVoiceServer({
  config,
  paths,
  connectLive: createLiveConnector(config),
  staticDir: path.join(__dirname, "..", "voice"),
});

const { url } = await app.listen();
console.log(`Voice intake ready → ${url}`);
console.log(`  model:       ${config.model}  (list options: npm run voice-models)`);
console.log(`  transcripts: ${path.relative(paths.repoRoot, paths.sessionsDir)}/ (gitignored)`);
console.log("  Use headphones — speaker echo makes the model interrupt itself.\n  Ctrl+C to stop.");

let closing = false;
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    if (closing) return;
    closing = true;
    await app.close();
    process.exit(0);
  });
}
