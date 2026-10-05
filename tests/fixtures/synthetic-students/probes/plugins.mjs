// Part 9 probe: plugin registry ↔ plugins/ directories, and the school yaml loads.
//   node tests/fixtures/synthetic-students/probes/plugins.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const { CONNECTOR_REGISTRY } = await import(path.join(repo, "browser/scripts/lib/connector-registry.mjs"));
const dirs = fs.readdirSync(path.join(repo, "plugins"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `plugins/${d.name}`);
const reg = CONNECTOR_REGISTRY.map((c) => c.pluginDir);
const noEntry = dirs.filter((d) => !reg.includes(d));
const noDir = reg.filter((d) => !dirs.includes(d));
console.log("registry:", CONNECTOR_REGISTRY.map((c) => `${c.id} (${c.bucket}, ${c.surface}) → ${c.pluginDir}`).join("; "));
console.log("dirs without registry entry:", noEntry.length ? noEntry : "none");
console.log("registry entries without dir:", noDir.length ? noDir : "none");
const { getSchoolConfig } = await import(path.join(repo, "browser/scripts/lib/school-config.mjs"));
const school = getSchoolConfig("cu-boulder");
console.log("school-config.mjs cu-boulder:", school.slug, school.canvas_url || school.canvasUrl || Object.keys(school).slice(0, 6).join(","));
const ok = !noEntry.length && !noDir.length && school.slug === "cu-boulder";
console.log(ok ? "PASS" : "FAIL");
process.exitCode = ok ? 0 : 1;
