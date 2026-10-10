// Loads landing/funnel.js (a plain browser script) into a sandbox, so the code
// generator and the tests use the exact rules the landing page runs.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const source = fileURLToPath(new URL("../../landing/funnel.js", import.meta.url));

export function loadFunnel() {
  const sandbox = { URLSearchParams };
  runInNewContext(readFileSync(source, "utf8"), sandbox, { filename: source });
  return sandbox.KairosFunnel;
}
