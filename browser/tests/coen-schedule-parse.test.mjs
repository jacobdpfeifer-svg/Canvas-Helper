import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseCuScheduleDate,
  parseEngineeringDinnersHtml,
} from "../scripts/lib/coen-schedule-parse.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = `<table><thead><tr><th>Date</th><th>Major</th><th>RSVP Link</th></tr></thead><tbody>
<tr><td>Wednesday, Aug. 26</td><td><p>Dinner A: Applied Math Major Dinner</p><p>Dinner B: Computer Science Major Dinner 1</p></td>
<td><p><a href="https://cglink.me/2vs/r385792">A: RSVP</a></p><p><a href="https://cglink.me/2vs/r385793">B: RSVP</a></p></td></tr>
<tr><td>Thursday, Aug. 27</td><td>Dinner A: Mechanical Engineering Major Dinner 2</td>
<td><a href="https://cglink.me/2vs/r385794">A: RSVP</a></td></tr>
</tbody></table>`;

describe("parseCuScheduleDate", () => {
  it("parses CU schedule dates", () => {
    assert.equal(parseCuScheduleDate("Wednesday, Aug. 26", 2026), "2026-08-26");
    assert.equal(parseCuScheduleDate("Tuesday, Sept. 1", 2026), "2026-09-01");
  });
});

describe("parseEngineeringDinnersHtml", () => {
  it("parses slot, major, date, and RSVP id from table", () => {
    const rows = parseEngineeringDinnersHtml(FIXTURE, { year: 2026 });
    assert.equal(rows.length, 3);
    const cs = rows.find((r) => r.rsvpId === "385793");
    assert.ok(cs);
    assert.equal(cs.date, "2026-08-26");
    assert.equal(cs.slot, "B");
    assert.match(cs.major, /Computer Science/);
    assert.equal(cs.cglink, "https://cglink.me/2vs/r385793");
  });

  it("parses live engineering page when fixture file present", () => {
    const livePath = path.join(__dirname, "fixtures", "engineering-dinners-snippet.html");
    if (!fs.existsSync(livePath)) return;
    const html = fs.readFileSync(livePath, "utf8");
    const rows = parseEngineeringDinnersHtml(html, { year: 2026 });
    assert.ok(rows.length >= 30);
    const cs = rows.find((r) => r.rsvpId === "385793");
    assert.ok(cs);
    assert.equal(cs.slot, "B");
  });
});
