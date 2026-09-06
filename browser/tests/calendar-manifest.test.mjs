import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapseSectionInstances,
  courseMdClassOverrides,
  dedupeManifestEvents,
  filterCanvasClassesWithOverrides,
  fromCalendarClasses,
  isSectionMeeting,
  isTimedCheckpoint,
  parseConfirmedClubEvents,
  parseQueueNotes,
  buildManifestFromSources,
} from "../scripts/lib/calendar-manifest.mjs";
import { diffManifest, eventToGoogleBody } from "../scripts/lib/google-calendar-sync.mjs";

describe("isSectionMeeting", () => {
  it("includes Canvas section rows", () => {
    assert.equal(isSectionMeeting("CSCI 1200 Fall 26 Section 800"), true);
  });

  it("excludes signup events", () => {
    assert.equal(isSectionMeeting("Major Dinner Sign Up"), false);
  });
});

describe("isTimedCheckpoint", () => {
  it("includes in-class presentations", () => {
    assert.equal(
      isTimedCheckpoint(
        "Advocate Version 1 (in-class presentation)",
        "Tue, Sep 1, 2026, 11:00 AM MT"
      ),
      true
    );
  });

  it("excludes 11:59 PM homework", () => {
    assert.equal(
      isTimedCheckpoint("WebAssign 2", "Thu, Aug 27, 2026, 11:59 PM MT"),
      false
    );
  });

  it("includes timed exams", () => {
    assert.equal(
      isTimedCheckpoint("Exam 1", "Wed, Sep 9, 2026, 8:15 PM MT"),
      true
    );
  });
});

describe("fromCalendarClasses", () => {
  it("collapses weekly section instances", () => {
    const events = fromCalendarClasses([
      {
        id: 1,
        title: "CSCI 1200 Fall 26 Section 800",
        start_at: "2026-08-25T21:00:00Z",
        end_at: "2026-08-25T21:50:00Z",
        context_name: "CSCI 1200",
      },
      {
        id: 2,
        title: "CSCI 1200 Fall 26 Section 800",
        start_at: "2026-08-27T21:00:00Z",
        end_at: "2026-08-27T21:50:00Z",
        context_name: "CSCI 1200",
      },
    ]);
    assert.equal(events.length, 1);
    assert.match(events[0].recurrence?.[0] || "", /FREQ=WEEKLY/);
    assert.equal(events[0].kind, "class");
  });
});

describe("parseQueueNotes", () => {
  it("extracts kind and RRULE from notes", () => {
    const meta = parseQueueNotes(
      "kind:club RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261210T235959 Colorado Triathlon weekly"
    );
    assert.equal(meta.kind, "club");
    assert.equal(meta.recurrence[0], "RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261210T235959");
    assert.match(meta.description, /Colorado Triathlon/);
  });
});

describe("parseConfirmedClubEvents", () => {
  it("parses CS dinner and AI lab from signup preferences", () => {
    const events = parseConfirmedClubEvents();
    const dinner = events.find((e) => e.id === "club:385793");
    const lab = events.find((e) => e.id === "club:386299");
    assert.ok(dinner);
    assert.equal(dinner.start, "2026-08-26T19:00:00");
    assert.ok(lab);
    assert.equal(lab.start, "2026-09-21T18:00:00");
  });
});

describe("buildManifestFromSources", () => {
  it("includes overrides and club events without canvas", () => {
    const manifest = buildManifestFromSources({ canvasEvents: [] });
    assert.ok(manifest.events.some((e) => e.id === "course:BCOR1030:class"));
    assert.ok(manifest.events.some((e) => e.id === "club:385793"));
    assert.ok(manifest.events.length >= 5);
  });

  it("includes CSCI mf and wed overrides with registrar times", () => {
    const manifest = buildManifestFromSources({ canvasEvents: [] });
    const mf = manifest.events.find((e) => e.id === "canvas:section:csci-1200-fall-26-section-800");
    const wed = manifest.events.find((e) => e.id === "course:CSCI1200:wed");
    assert.ok(mf);
    assert.equal(mf.start, "2026-08-25T09:05:00");
    assert.equal(mf.end, "2026-08-25T09:55:00");
    assert.equal(mf.location, "ECCR 211");
    assert.ok(wed);
    assert.equal(wed.start, "2026-08-27T09:05:00");
    assert.equal(wed.end, "2026-08-27T10:45:00");
    assert.equal(wed.location, "ECCR 211");
    assert.equal(manifest.gaps.length, 0);
  });

  it("uses 12:20 APPM times from registrar schedule", () => {
    const overrides = courseMdClassOverrides();
    const mwf = overrides.find((e) => e.id === "course:APPM1235:mwf");
    const rec = overrides.find((e) => e.id === "course:APPM1235:recitation");
    assert.equal(mwf.start, "2026-08-25T12:20:00");
    assert.equal(mwf.end, "2026-08-25T13:10:00");
    assert.equal(rec.start, "2026-08-28T12:20:00");
    assert.equal(rec.end, "2026-08-28T13:10:00");
    assert.doesNotMatch(mwf.start, /09:00/);
  });

  it("suppresses duplicate Canvas CSCI section when override exists", () => {
    const overrides = courseMdClassOverrides();
    const canvasClasses = fromCalendarClasses([
      {
        id: 1,
        title: "CSCI 1200 Fall 26 Section 800",
        start_at: "2026-08-25T15:05:00Z",
        end_at: "2026-08-25T15:55:00Z",
        context_name: "CSCI 1200",
      },
      {
        id: 2,
        title: "CSCI 1200 Fall 26 Section 800",
        start_at: "2026-08-29T15:05:00Z",
        end_at: "2026-08-29T15:55:00Z",
        context_name: "CSCI 1200",
      },
    ]);
    const filtered = filterCanvasClassesWithOverrides(canvasClasses, overrides);
    assert.equal(filtered.length, 0);

    const manifest = buildManifestFromSources({
      canvasEvents: [
        {
          id: 1,
          title: "CSCI 1200 Fall 26 Section 800",
          start_at: "2026-08-25T15:05:00Z",
          end_at: "2026-08-25T15:55:00Z",
          context_name: "CSCI 1200",
        },
        {
          id: 2,
          title: "CSCI 1200 Fall 26 Section 800",
          start_at: "2026-08-29T15:05:00Z",
          end_at: "2026-08-29T15:55:00Z",
          context_name: "CSCI 1200",
        },
      ],
    });
    const csciClasses = manifest.events.filter(
      (e) => e.kind === "class" && /csci/i.test(`${e.summary} ${e.course || ""}`)
    );
    assert.equal(csciClasses.length, 2);
    assert.ok(csciClasses.some((e) => e.id === "canvas:section:csci-1200-fall-26-section-800"));
    assert.ok(csciClasses.some((e) => e.id === "course:CSCI1200:wed"));
  });
});

describe("google-calendar-sync", () => {
  it("tags events with cu_id in extended properties", () => {
    const body = eventToGoogleBody({
      id: "course:BCOR1030:class",
      summary: "BCOR 1030",
      start: "2026-08-26T14:00:00",
      end: "2026-08-26T15:15:00",
      timezone: "America/Denver",
      source: "course_md",
      kind: "class",
    });
    assert.equal(body.extendedProperties.private.cu_id, "course:BCOR1030:class");
  });

  it("diff detects creates for new manifest", () => {
    const manifest = {
      hash: "abc",
      events: [
        {
          id: "test:1",
          summary: "Test",
          start: "2026-08-26T14:00:00",
          end: "2026-08-26T15:00:00",
          timezone: "America/Denver",
          source: "manual",
          kind: "manual",
        },
      ],
    };
    const diff = diffManifest(manifest, { mappings: {} });
    assert.equal(diff.creates.length, 1);
    assert.equal(diff.updates.length, 0);
  });
});
