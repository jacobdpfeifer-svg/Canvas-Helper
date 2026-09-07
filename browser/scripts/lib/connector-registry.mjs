/**
 * Static, human-curated Bucket-A connector registry.
 *
 * Connectors are versioned under plugins/ and land only via reviewed PRs.
 * Agents must never fetch, write, or execute third-party code to fill a gap —
 * flag missing tools (see writeToolGapsFile) and stop.
 *
 * Contract: docs in plugins/README.md (modeled on cu-boulder-campusgroups).
 */
import { getSchoolConfig } from "./school-config.mjs";

/**
 * @typedef {object} ConnectorEntry
 * @property {string} id            Registry id (`{school}/{slug}`)
 * @property {string} school        SCHOOL_SLUG this connector is valid for
 * @property {string} slug          Tool slug (matches inventory / gap flags)
 * @property {string} name          Display name
 * @property {"A"} bucket           Only Bucket A may appear here (Bucket B forbidden)
 * @property {string} pluginDir     Repo-relative plugin directory
 * @property {string} [shim]        Optional browser/scripts/lib/*.mjs re-export path
 * @property {boolean} writeCapable Whether any action mutates the student account
 * @property {string} confirmationGuard
 *   `required-on-mcp-write` — MCP writes must use ConfirmationGuard
 *   `n/a` — read-only connector (still no Bucket-B automation)
 */

/** @type {readonly ConnectorEntry[]} */
export const CONNECTOR_REGISTRY = Object.freeze([
  {
    id: "cu-boulder/campusgroups",
    school: "cu-boulder",
    slug: "campusgroups",
    name: "CampusGroups",
    bucket: "A",
    pluginDir: "plugins/cu-boulder-campusgroups",
    shim: "browser/scripts/lib/campusgroups-session.mjs",
    writeCapable: true,
    confirmationGuard: "required-on-mcp-write",
  },
]);

/** @param {string} [schoolSlug] */
export function listConnectorsForSchool(schoolSlug) {
  const slug = schoolSlug || getSchoolConfig().slug || "";
  return CONNECTOR_REGISTRY.filter((c) => c.school === slug && c.bucket === "A");
}

/** @param {string} toolSlug @param {string} [schoolSlug] */
export function findConnector(toolSlug, schoolSlug) {
  const needle = String(toolSlug || "")
    .toLowerCase()
    .trim();
  if (!needle) return null;
  return (
    listConnectorsForSchool(schoolSlug).find(
      (c) => c.slug === needle || c.name.toLowerCase() === needle
    ) || null
  );
}

/** @param {string} toolSlug @param {string} [schoolSlug] */
export function hasConnector(toolSlug, schoolSlug) {
  return !!findConnector(toolSlug, schoolSlug);
}
