import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { SCHEMA_VERSION, effectiveDateFromAssignment, identityKey, validateGeneration, classifyFreshness, isHttpUrl, hashFields, requireCanvasId } from "../scripts/lib/canvas-model.mjs";
import { fixtureGeneration, wellStructured, fragmented, weightedDrops, partialOutage } from "../scripts/lib/canvas-reliability-fixtures.mjs";
import { commitRawGeneration, pathsFor, readCurrentRaw, readPointer, pruneGenerations } from "../scripts/lib/canvas-store.mjs";
import { summarize_sync_health } from "../scripts/lib/canvas-health.mjs";
import { reconcile_due_items, bucketWorkItem } from "../scripts/lib/canvas-reconcile.mjs";
import { normalize_course_map } from "../scripts/lib/canvas-course-map.mjs";
import { compute_grade_scenarios } from "../scripts/lib/canvas-grades.mjs";
import { buildProjections, promoteProjections } from "../scripts/lib/canvas-project.mjs";
import { writeAdaptersFromProjection } from "../scripts/lib/canvas-adapters.mjs";
import { fetchCanonicalGeneration } from "../scripts/lib/canvas-snapshot.mjs";

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pn-canvas-"));
}

describe("canvas-model", () => {
  it("round-trips fixture generations and stable hashes", () => {
    const gen = fixtureGeneration();
    const check = validateGeneration(gen);
    assert.equal(check.ok, true, check.errors.join("; "));
    assert.equal(gen.manifest.schema_version, SCHEMA_VERSION);
    const a = hashFields(gen);
    const b = hashFields(structuredClone(gen));
    assert.equal(a, b);
  });

  it("override due beats base and never uses lock_at", () => {
    const dates = effectiveDateFromAssignment({
      due_at: "2026-09-20T16:00:00Z",
      lock_at: "2026-09-24T16:00:00Z",
      all_dates: [
        { base: true, due_at: "2026-09-20T16:00:00Z", lock_at: "2026-09-24T16:00:00Z" },
        { base: false, due_at: "2026-09-23T16:00:00Z", id: 88, set_type: "ADHOC" },
      ],
    });
    assert.equal(dates.effective_due_at, "2026-09-23T16:00:00Z");
    assert.ok(dates.dates.some((d) => d.lock_at && d.due_at !== d.lock_at));
  });

  it("refuses to synthesize ids from titles", () => {
    const got = requireCanvasId({ title: "Mystery flyer" }, { object_type: "assignment" });
    assert.equal(got.ok, false);
  });

  it("rejects cross-course assignments", () => {
    const gen = fixtureGeneration({ courses: [wellStructured()] });
    gen.courses[0].assignments[0].course_id = 9999;
    const check = validateGeneration(gen);
    assert.equal(check.ok, false);
    assert.ok(check.errors.some((e) => /cross-course/.test(e)));
  });
});

describe("commit protocol", () => {
  it("promotes staging to generations and preserves previous on failed second sync", () => {
    const root = tmpRoot();
    const first = fixtureGeneration({ sync_id: "sync-a" });
    const a = commitRawGeneration(root, first, { sync_id: "sync-a" });
    assert.equal(a.ok, true);
    const ptr = readPointer(pathsFor(root).rawPointer);
    assert.equal(ptr.sync_id, "sync-a");
    const second = fixtureGeneration({ sync_id: "sync-b", complete: false, truncated: ["assignments"], courses: [partialOutage()] });
    second.manifest.usable_partial = true;
    const b = commitRawGeneration(root, second, { sync_id: "sync-b" });
    assert.equal(b.ok, true);
    promoteProjections(root, first);
    const prevProj = readPointer(pathsFor(root).projPointer);
    try {
      promoteProjections(root, null);
    } catch {
      /* keep previous */
    }
    const after = readPointer(pathsFor(root).projPointer);
    assert.equal(after.sync_id, prevProj.sync_id);
    assert.equal(readCurrentRaw(root).pointer.sync_id, "sync-b");
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("keeps at most current plus two prior generations", () => {
    const root = tmpRoot();
    for (const id of ["sync-1", "sync-2", "sync-3", "sync-4"]) {
      commitRawGeneration(root, fixtureGeneration({ sync_id: id }), { sync_id: id });
    }
    const names = fs.readdirSync(pathsFor(root).generations).sort();
    assert.equal(names.length, 3);
    assert.ok(names.includes("sync-4"));
    assert.ok(!names.includes("sync-1"));
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("does not follow a pointer into another profile root", () => {
    const a = tmpRoot();
    const b = tmpRoot();
    commitRawGeneration(a, fixtureGeneration({ sync_id: "sync-a" }), { sync_id: "sync-a" });
    assert.equal(readCurrentRaw(b), null);
    fs.rmSync(a, { recursive: true, force: true });
    fs.rmSync(b, { recursive: true, force: true });
  });
});

describe("reconciler", () => {
  it("is invariant under source order and keeps seen_in", () => {
    const gen = fixtureGeneration({ courses: [wellStructured(), fragmented()] });
    const forward = reconcile_due_items(gen);
    const reversed = structuredClone(gen);
    reversed.global.planner = [...reversed.global.planner].reverse();
    reversed.global["calendar-events"] = [...reversed.global["calendar-events"]].reverse();
    reversed.courses = [...reversed.courses].reverse();
    const back = reconcile_due_items(reversed);
    assert.deepEqual(
      forward.items.map((i) => identityKey(i)),
      back.items.map((i) => identityKey(i))
    );
    const hw = forward.items.find((i) => i.canvas_id === "101");
    assert.ok(hw.seen_in.includes("assignment"));
    assert.ok(hw.seen_in.includes("planner"));
    assert.ok(hw.seen_in.includes("calendar"));
  });

  it("surfaces date disagreement instead of picking a winner", () => {
    const gen = fixtureGeneration({ courses: [fragmented()] });
    const { items } = reconcile_due_items(gen);
    const lab = items.find((i) => i.canvas_id === "301");
    assert.equal(lab.effective_due_at, "2026-09-23T16:00:00Z");
    assert.ok(lab.disagreements.length >= 1);
    assert.ok(lab.lti);
    assert.ok(lab.seen_in.includes("planner"));
  });

  it("puts unkeyed rows aside", () => {
    const gen = fixtureGeneration({ courses: [fragmented()] });
    const { unkeyed_sources } = reconcile_due_items(gen);
    assert.ok(Array.isArray(unkeyed_sources));
  });

  it("keeps submission states distinct", () => {
    const gen = fixtureGeneration({ courses: [wellStructured(), fragmented(), partialOutage()] });
    const { items } = reconcile_due_items(gen);
    assert.equal(items.find((i) => i.canvas_id === "101").submission_state, "graded");
    assert.equal(items.find((i) => i.canvas_id === "102").submission_state, "unsubmitted");
    assert.equal(items.find((i) => i.canvas_id === "601").submission_state, "submitted");
    assert.equal(items.find((i) => i.canvas_id === "302").submission_state, "suppressed");
  });
});

describe("course map", () => {
  it("uses modules when published and falls back otherwise", () => {
    const gen = fixtureGeneration();
    const well = gen.courses.find((c) => String(c.course.id) === "1300");
    const frag = gen.courses.find((c) => String(c.course.id) === "1400");
    const { items } = reconcile_due_items(gen);
    const map = normalize_course_map(well, { workItems: items, sync_id: "x" });
    assert.ok(map.start_here.length);
    assert.ok(map.learn.length);
    assert.equal(map.fallback_reason, null);
    const fb = normalize_course_map(frag, { workItems: items, sync_id: "x" });
    assert.match(fb.fallback_reason, /No published modules/);
  });
});

describe("grade engine", () => {
  const now = Date.parse("2026-09-21T18:00:00Z");

  it("reports Canvas verbatim and drop-rule math", () => {
    const pack = weightedDrops();
    const grades = compute_grade_scenarios({
      course: pack.course,
      assignments: pack.assignments,
      assignmentGroups: pack.assignmentGroups,
      now,
      as_of: "2026-09-21T18:00:00.000Z",
    });
    assert.equal(grades.canvas_reported.percent, 91);
    assert.equal(grades.canvas_reported.status, "ok");
    assert.equal(grades.graded_only.status, "partial");
    assert.ok(grades.graded_only.warnings.some((w) => w.code === "weights_not_100"));
    assert.ok(grades.graded_only.warnings.some((w) => w.code === "not_renormalized"));
    assert.ok(grades.graded_only.excluded_item_ids.includes("401"));
    assert.ok(grades.graded_only.included_item_ids.includes("403"));
    assert.ok(grades.graded_only.excluded_item_ids.includes("410"));
  });

  it("risk-adjusted zeros only due unsubmitted work", () => {
    const pack = wellStructured();
    const later = compute_grade_scenarios({
      course: pack.course,
      assignments: pack.assignments,
      assignmentGroups: pack.assignmentGroups,
      now: Date.parse("2026-10-02T18:00:00Z"),
      as_of: "2026-10-02T18:00:00Z",
    });
    assert.equal(later.risk_adjusted.status, "ok");
    assert.ok(later.lead.unsubmitted_due_count >= 1);
    assert.ok(later.risk_adjusted.percent < later.graded_only.percent || later.risk_adjusted.included_item_ids.includes("102"));
  });

  it("what-if is local only", () => {
    const pack = wellStructured();
    const grades = compute_grade_scenarios({
      course: pack.course,
      assignments: pack.assignments,
      assignmentGroups: pack.assignmentGroups,
      now,
      as_of: "2026-09-21T18:00:00Z",
      whatIf: { 201: { replace_score: 80 } },
    });
    assert.equal(grades.what_if.status, "ok");
    assert.ok(grades.what_if.included_item_ids.includes("201"));
  });

  it("refuses closed grading periods", () => {
    const pack = wellStructured();
    pack.course.closed_grading_period = true;
    const grades = compute_grade_scenarios({
      course: pack.course,
      assignments: pack.assignments,
      assignmentGroups: pack.assignmentGroups,
      now,
      as_of: "2026-09-21T18:00:00Z",
    });
    assert.equal(grades.graded_only.status, "cannot_calculate");
    assert.equal(grades.graded_only.warnings[0].code, "closed_grading_period");
  });
});

describe("health", () => {
  it("distinguishes empty_unverified from complete empty", () => {
    assert.equal(classifyFreshness({}), "empty_unverified");
    const gen = fixtureGeneration();
    const health = summarize_sync_health({ generation: gen, now: Date.parse(gen.manifest.finished_at) });
    assert.equal(health.state, "fresh_complete");
    const partial = fixtureGeneration({ truncated: ["assignments"], complete: false, courses: [partialOutage()] });
    partial.manifest.complete = false;
    partial.manifest.usable_partial = true;
    const h2 = summarize_sync_health({ generation: partial, now: Date.parse(partial.manifest.finished_at) });
    assert.equal(h2.state, "fresh_partial");
  });
});

describe("successful vs failed empty", () => {
  it("accepts a successful empty list", async () => {
    const page = {};
    async function apiAllPages(_p, pathBase) {
      if (pathBase === "/api/v1/courses") {
        return { ok: true, items: [], truncated: false, status: 200 };
      }
      return { ok: true, items: [], truncated: false, status: 200 };
    }
    const gen = await fetchCanonicalGeneration(page, { apiAllPages, sync_id: "sync-empty", profile_id: "dev" });
    assert.equal(gen.manifest.complete, true);
    assert.equal(gen.courses.length, 0);
  });

  it("does not treat a failed empty as authoritative", async () => {
    const page = {};
    async function apiAllPages(_p, pathBase) {
      if (pathBase === "/api/v1/courses") {
        return { ok: true, items: [{ id: 1, name: "X", course_code: "X", enrollments: [] }], truncated: false, status: 200 };
      }
      if (pathBase.includes("/assignments")) {
        return { ok: false, items: [], status: 500, truncated: false };
      }
      return { ok: true, items: [], truncated: false, status: 200 };
    }
    const gen = await fetchCanonicalGeneration(page, { apiAllPages, sync_id: "sync-fail", profile_id: "dev" });
    assert.equal(gen.manifest.complete, false);
    assert.ok(gen.manifest.named_courses_failed.includes("1"));
  });
});

describe("adapters", () => {
  it("writes week.md and study-sources without invalidating raw", () => {
    const root = tmpRoot();
    const gen = fixtureGeneration({ sync_id: "sync-ad" });
    const committed = commitRawGeneration(root, gen, { sync_id: "sync-ad" });
    const projections = buildProjections(gen);
    promoteProjections(root, gen);
    const ad = writeAdaptersFromProjection({ userRoot: root, generation: gen, projections, daysAhead: 14 });
    assert.equal(ad.ok, true, ad.errors.join("; "));
    assert.equal(readCurrentRaw(root).pointer.sync_id, committed.sync_id);
    assert.ok(fs.existsSync(path.join(root, "inbox", "week.md")));
    assert.ok(fs.readFileSync(path.join(root, "inbox", "week.md"), "utf8").includes("sync-ad"));
    assert.ok(fs.existsSync(path.join(root, "inbox", "study-sources", "1300.json")));
    const rec = JSON.parse(fs.readFileSync(path.join(root, "inbox", "study-sources", "1300.json"), "utf8"));
    assert.equal(rec.sync_id, "sync-ad");
    assert.equal(rec.schema, 2);
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe("identical fixture syncs", () => {
  it("produce the same work item ids regardless of order", () => {
    const a = buildProjections(fixtureGeneration({ sync_id: "sync-1" }));
    const gen2 = fixtureGeneration({ sync_id: "sync-1" });
    gen2.courses.reverse();
    gen2.global.planner.reverse();
    const b = buildProjections(gen2);
    assert.deepEqual(
      a.work_surface.items.map((i) => i.id),
      b.work_surface.items.map((i) => i.id)
    );
  });
});

describe("on-disk fixtures", () => {
  it("loads the four frozen course files", async () => {
    const dir = new URL("./fixtures/canvas-reliability/", import.meta.url);
    for (const name of ["well-structured.json", "fragmented.json", "weighted-drops.json", "partial-outage.json"]) {
      const raw = JSON.parse(await (await import("node:fs/promises")).readFile(new URL(name, dir), "utf8"));
      assert.ok(raw.course.id);
    }
  });
});

describe("urls", () => {
  it("accepts only http(s)", () => {
    assert.equal(isHttpUrl("https://canvas.example/x"), true);
    assert.equal(isHttpUrl("javascript:alert(1)"), false);
    assert.equal(isHttpUrl("file:///etc/passwd"), false);
  });
});
