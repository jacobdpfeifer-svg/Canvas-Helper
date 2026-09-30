/**
 * Copy the dependency-free freshness modules from the local brain into the
 * extension (an unpacked extension cannot import from outside its folder).
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

export function vendoredText(name) {
  const source = fs.readFileSync(path.join(SOURCE_DIR, `${name}.mjs`), "utf8");
  const body = source.replace(/from "\.\/([a-z-]+)\.mjs";/g, 'from "./$1.js";');
  return `// GENERATED from browser/scripts/lib/freshness/${name}.mjs by tools/vendor-shared.mjs — edit the source, not this copy.\n${body}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes("--check");
  let drift = false;
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  for (const name of MODULES) {
    const target = path.join(TARGET_DIR, `${name}.js`);
    const want = vendoredText(name);
    const have = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
    if (have === want) continue;
    drift = true;
    if (check) console.error(`drift: shared/${name}.js`);
    else fs.writeFileSync(target, want);
  }
  if (check && drift) process.exit(1);
}
