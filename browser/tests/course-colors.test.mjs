import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { COLORS_PATH, courseColorsFile, parseCourseColors, syncCourseColors } from "../scripts/lib/course-colors.mjs";

test("parseCourseColors keeps course hex colours only", () => {
  const out = parseCourseColors({
    custom_colors: {
      course_101: "#E1AD49",
      course_202: " #f60 ",
      group_7: "#123456",
      user_9: "#abcdef",
      course_303: "red",
      course_404: "#12345g",
      "course_5; drop": "#111111",
    },
  });
  assert.deepEqual(out, { 101: "#e1ad49", 202: "#f60" });
});

test("parseCourseColors tolerates junk", () => {
  assert.deepEqual(parseCourseColors(null), {});
  assert.deepEqual(parseCourseColors("while(1);"), {});
  assert.deepEqual(parseCourseColors({ custom_colors: [] }), {});
});

test("syncCourseColors does one GET to the colors endpoint and writes colors.json", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pn-colors-"));
  const calls = [];
  const api = async (_page, p) => {
    calls.push(p);
    return { ok: true, status: 200, json: { custom_colors: { course_1: "#3767ff" } } };
  };
  const r = await syncCourseColors({ page: {}, api, userRoot: root });
  assert.deepEqual(r, { ok: true, count: 1 });
  assert.deepEqual(calls, [COLORS_PATH]);
  assert.deepEqual(JSON.parse(fs.readFileSync(courseColorsFile(root), "utf8")), { 1: "#3767ff" });
  fs.rmSync(root, { recursive: true, force: true });
});

test("syncCourseColors never throws and leaves no file on failure", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pn-colors-"));
  const r1 = await syncCourseColors({ page: {}, api: async () => ({ ok: false, status: 401, json: null }), userRoot: root });
  assert.equal(r1.ok, false);
  const r2 = await syncCourseColors({ page: {}, api: async () => { throw new Error("boom"); }, userRoot: root });
  assert.equal(r2.ok, false);
  assert.equal(fs.existsSync(courseColorsFile(root)), false);
  fs.rmSync(root, { recursive: true, force: true });
});
