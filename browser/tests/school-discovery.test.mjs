import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildSchoolProfile,
  currentTerm,
  dominantTimeZone,
  enrichFromCanvas,
  hostSlug,
  normalizeCanvasHost,
  readSchoolProfile,
  searchSchools,
  writeSchoolProfile,
} from "../scripts/lib/school-discovery.mjs";
import { clearSchoolConfigCache, findCuratedSlugForHost, getSchoolConfig } from "../scripts/lib/school-config.mjs";

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kairos-school-"));
}

function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) {
    saved[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  clearSchoolConfigCache();
  try {
    return fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    clearSchoolConfigCache();
  }
}

test("normalizeCanvasHost accepts bare hosts and URLs, rejects junk", () => {
  assert.equal(normalizeCanvasHost("osu.instructure.com"), "osu.instructure.com");
  assert.equal(normalizeCanvasHost("https://Canvas.Colorado.edu/courses/1"), "canvas.colorado.edu");
  assert.throws(() => normalizeCanvasHost(""), /Canvas address/);
  assert.throws(() => normalizeCanvasHost("not a url"), /not a/);
  assert.equal(hostSlug("canvas.colorado.edu"), "canvas-colorado-edu");
});

test("searchSchools maps Instructure rows, drops rows without a domain, dedupes hosts", async () => {
  const rows = [
    { id: 132008, name: "Ohio State – CarmenCanvas", domain: "osu.instructure.com" },
    { id: 1, name: "No domain" },
    { id: 2, name: "Dup", domain: "OSU.instructure.com" },
  ];
  const fetchImpl = async (url) => {
    assert.match(url, /search_term=ohio%20state/);
    return { ok: true, json: async () => rows };
  };
  const out = await searchSchools("ohio state", { fetchImpl });
  assert.deepEqual(out, [{ name: "Ohio State – CarmenCanvas", host: "osu.instructure.com", account_id: 132008 }]);
  assert.deepEqual(await searchSchools("o", { fetchImpl }), []);
});

test("a chosen school with a curated yaml resolves to that tenant", () => {
  const root = tmpRoot();
  writeSchoolProfile(buildSchoolProfile({ host: "canvas.colorado.edu", name: "CU", curatedSlug: findCuratedSlugForHost("canvas.colorado.edu") }), root);
  withEnv({ DEV_USER_ROOT: root, SCHOOL_SLUG: undefined }, () => {
    const cfg = getSchoolConfig();
    assert.equal(cfg.slug, "cu-boulder");
    assert.equal(cfg.timezone, "America/Denver");
  });
});

test("a chosen school with no curated yaml still works from Canvas-discovered facts", () => {
  const root = tmpRoot();
  const profile = buildSchoolProfile({ host: "osu.instructure.com", name: "Ohio State", accountId: 132008 });
  profile.discovered = { timezone: "America/New_York", term: { name: "Autumn 2026", start_at: "2026-08-20T00:00:00Z", end_at: "2026-12-12T00:00:00Z" } };
  writeSchoolProfile(profile, root);
  withEnv({ DEV_USER_ROOT: root, SCHOOL_SLUG: undefined }, () => {
    const cfg = getSchoolConfig();
    assert.equal(cfg.slug, "osu-instructure-com");
    assert.equal(cfg.display_name, "Ohio State");
    assert.equal(cfg.canvas_base_url, "https://osu.instructure.com");
    assert.equal(cfg.timezone, "America/New_York");
    assert.equal(cfg.term_dates.current_name, "Autumn 2026");
    assert.ok(Object.keys(cfg.grade_scale).length > 0, "generic grade scale from the template");
  });
});

test("no school chosen is an explicit error, never a default school", () => {
  const root = tmpRoot();
  withEnv({ DEV_USER_ROOT: root, SCHOOL_SLUG: undefined }, () => {
    assert.throws(() => getSchoolConfig(), /No school chosen yet/);
  });
  assert.equal(readSchoolProfile(root), null);
});

test("enrichFromCanvas reads time zone, current term, and brand color", async () => {
  const profile = buildSchoolProfile({ host: "osu.instructure.com", name: "Ohio State" });
  const courses = [
    { time_zone: "America/New_York", term: { name: "Summer 2026", start_at: "2026-05-10T00:00:00Z", end_at: "2026-08-01T00:00:00Z" } },
    { time_zone: "America/New_York", term: { name: "Autumn 2026", start_at: "2026-08-20T00:00:00Z", end_at: "2026-12-12T00:00:00Z" } },
    { time_zone: "America/Chicago", term: null },
  ];
  const getJson = async (p) => (p.startsWith("/api/v1/courses") ? courses : { time_zone: "America/Denver" });
  const fetchPublic = async () => ({ ok: true, json: async () => ({ "ic-brand-button--primary-bgd": "#bb0000" }) });
  const next = await enrichFromCanvas(profile, { getJson, fetchPublic, now: new Date("2026-10-07T12:00:00Z") });
  assert.equal(next.discovered.timezone, "America/New_York");
  assert.equal(next.discovered.term.name, "Autumn 2026");
  assert.equal(next.discovered.brand_color, "#bb0000");
});

test("enrichment helpers fall back sensibly", () => {
  assert.equal(dominantTimeZone([], "America/Denver"), "America/Denver");
  assert.equal(currentTerm([]), null);
});
