/**
 * Copy dependency-free modules into the extension (an unpacked extension
 * cannot import from outside its folder):
 *   - freshness modules from the local brain → shared/*.js
 *   - the Blot engine from the app → shared/blot/*.js
 *
 *   node app/extension-chrome/tools/vendor-shared.mjs          # write copies
 *   node app/extension-chrome/tools/vendor-shared.mjs --check  # exit 1 on drift
 *
 * browser/tests/extension.test.mjs runs the same comparison.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SOURCE_DIR = path.resolve(here, "..", "..", "..", "browser", "scripts", "lib", "freshness");
export const TARGET_DIR = path.resolve(here, "..", "shared");
export const MODULES = ["actions", "classify", "view"];

export const BLOT_SOURCE_DIR = path.resolve(here, "..", "..", "src", "blot", "core");
export const BLOT_TARGET_DIR = path.resolve(TARGET_DIR, "blot");
export const BLOT_MODULES = ["index", "engine", "body", "machine", "render", "level", "timeline", "poses"];

export function vendoredBlotText(name) {
  const source = fs.readFileSync(path.join(BLOT_SOURCE_DIR, `${name}.js`), "utf8");
  return `// GENERATED from app/src/blot/core/${name}.js by tools/vendor-shared.mjs — edit the source, not this copy.\n${source}`;
}

export function vendoredText(name) {
  const source = fs.readFileSync(path.join(SOURCE_DIR, `${name}.mjs`), "utf8");
  const body = source.replace(/from "\.\/([a-z-]+)\.mjs";/g, 'from "./$1.js";');
  return `// GENERATED from browser/scripts/lib/freshness/${name}.mjs by tools/vendor-shared.mjs — edit the source, not this copy.\n${body}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes("--check");
  let drift = false;
  const jobs = [
    ...MODULES.map((name) => [path.join(TARGET_DIR, `${name}.js`), vendoredText(name), `shared/${name}.js`]),
    ...BLOT_MODULES.map((name) => [path.join(BLOT_TARGET_DIR, `${name}.js`), vendoredBlotText(name), `shared/blot/${name}.js`]),
  ];
  fs.mkdirSync(BLOT_TARGET_DIR, { recursive: true });
  for (const [target, want, label] of jobs) {
    const have = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
    if (have === want) continue;
    drift = true;
    if (check) console.error(`drift: ${label}`);
    else fs.writeFileSync(target, want);
  }
  if (check && drift) process.exit(1);
}
