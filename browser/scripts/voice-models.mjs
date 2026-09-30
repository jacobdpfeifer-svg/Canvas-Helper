/**
 * List Gemini models your key can use for the Live API (bidiGenerateContent).
 * Live model ids change often — pick one and set GEMINI_LIVE_MODEL in .env.
 *
 * Usage: cd browser && npm run voice-models
 */
import { loadRepoEnv, readVoiceConfig } from "./lib/voice/config.mjs";
import { listLiveModels } from "./lib/voice/live.mjs";

loadRepoEnv();
const config = readVoiceConfig();

if (!config.apiKey) {
  console.error("Missing GEMINI_API_KEY in the repo-root .env (see docs/VOICE.md).");
  process.exit(1);
}

const models = await listLiveModels(config.apiKey);
if (!models.length) {
  console.log("No Live-capable models returned for this key.");
  process.exit(0);
}
for (const m of models) {
  console.log(`${m.name === config.model ? "*" : " "} ${m.name}${m.displayName ? `  — ${m.displayName}` : ""}`);
}
console.log(`\n* = current (GEMINI_LIVE_MODEL=${config.model}). Set GEMINI_LIVE_MODEL in .env to change.`);
