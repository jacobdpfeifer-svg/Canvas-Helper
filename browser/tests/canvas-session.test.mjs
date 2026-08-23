import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDenverDays,
  buildWeekNoteParts,
  classifyOutcomeHint,
  COURSE_FILE_MAP,
  dedupeRows,
  extractLinksFromHtml,
  filterPolicyPages,
  hasCampusGroupsLink,
  hasUploadAfterEventHint,
  isCheckpoint,
  denverDay,
  denverMidnightUtc,
  filterDatedInWindow,
  mergeCourseFileContent,
  parseAgentPolicyFromSyllabus,
  formatAgentPolicyNotes,
  resolveCourseFile,
  shouldIncludeInWeekTable,
  stripHtmlTags,
  syllabusHash,
} from "../scripts/lib/canvas-session.mjs";

describe("denverMidnightUtc", () => {
  it("returns Denver midnight in August (MDT, UTC-6)", () => {
    const m = denverMidnightUtc("2026-08-22");
    assert.equal(m.toISOString(), "2026-08-22T06:00:00.000Z");
    assert.equal(denverDay(m), "2026-08-22");
  });

  it("returns Denver midnight in January (MST, UTC-7)", () => {
    const m = denverMidnightUtc("2026-01-15");
    assert.equal(m.toISOString(), "2026-01-15T07:00:00.000Z");
    assert.equal(denverDay(m), "2026-01-15");
  });
});

describe("addDenverDays", () => {
  it("adds calendar days in Denver", () => {
    assert.equal(addDenverDays("2026-08-22", 14), "2026-09-05");
  });
});

describe("filterDatedInWindow", () => {
  const rows = [
    { title: "in", due: "2026-08-22T12:00:00Z", complete: false },
    { title: "out past", due: "2026-08-01T12:00:00Z", complete: false },
    { title: "out future", due: "2026-09-20T12:00:00Z", complete: false },
    { title: "done", due: "2026-08-23T12:00:00Z", complete: true },
  ];

  it("includes rows in Denver day window", () => {
    const filtered = filterDatedInWindow(rows, {
      today: "2026-08-22",
      daysAhead: 7,
      includeComplete: false,
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].title, "in");
  });

  it("can include completed rows", () => {
    const filtered = filterDatedInWindow(rows, {
      today: "2026-08-22",
      daysAhead: 7,
      includeComplete: true,
    });
    assert.equal(filtered.length, 2);
  });
});

describe("classifyOutcomeHint", () => {
  it("tags external_tool as LTI", () => {
    const hint = classifyOutcomeHint("Ch. 1 EOC Problems", "external_tool");
    assert.match(hint, /outcome:lti/);
  });

  it("tags presentations before advocate discussion", () => {
    const hint = classifyOutcomeHint(
      "Advocate Version 1 (in-class presentation)",
      "assignment"
    );
    assert.match(hint, /outcome:presentation/);
  });

  it("tags PlayPosit as LTI", () => {
    const hint = classifyOutcomeHint("I -- PlayPosit Learner Experience", "assignment");
    assert.match(hint, /outcome:lti/);
  });

  it("tags thought projects as written reflection", () => {
    const hint = classifyOutcomeHint(
      "Thought Project #1: Your Personal Philosophy of Higher Education",
      "assignment"
    );
    assert.match(hint, /outcome:written/);
  });

  it("tags challenge activities as lab", () => {
    const hint = classifyOutcomeHint("Python Introduction: Challenge Activities", "assignment");
    assert.match(hint, /outcome:lab/);
  });

  it("tags external CampusGroups signup with upload-after-event", () => {
    const desc =
      '<a href="https://cglink.me/2vs/r385793">RSVP</a> After you attend, upload a selfie to Canvas.';
    const hint = classifyOutcomeHint(
      "Assignment #1: Sign Up For Your Major Dinner",
      "assignment",
      desc
    );
    assert.match(hint, /outcome:signup-external\+upload-after-event/);
    assert.match(hint, /rsvp:CampusGroups/);
    assert.match(hint, /canvas_submit:post-dinner selfie/);
  });

  it("tags major dinner with engineering schedule link as external two-step", () => {
    const desc =
      '<a href="https://www.colorado.edu/engineering/students/housing/engineering-connections-residential-community/engineering-connections-major-dinners">schedule</a>';
    const hint = classifyOutcomeHint(
      "Assignment #1: Sign Up For Your Major Dinner",
      "assignment",
      desc
    );
    assert.match(hint, /outcome:signup-external\+upload-after-event/);
    assert.match(hint, /rsvp:CampusGroups/);
  });

  it("tags plain signup without external link", () => {
    const hint = classifyOutcomeHint("Recitation signup sheet", "assignment", "");
    assert.match(hint, /^outcome:signup$/);
  });

  it("tags AI lab workshop as external two-step", () => {
    const hint = classifyOutcomeHint("AI Lab Workshop Sign Up", "assignment", "");
    assert.match(hint, /outcome:signup-external\+upload-after-event/);
  });
});

describe("extractLinksFromHtml", () => {
  it("extracts href values", () => {
    const links = extractLinksFromHtml(
      '<p><a href="https://cglink.me/2vs/r385793">RSVP</a></p>'
    );
    assert.deepEqual(links, ["https://cglink.me/2vs/r385793"]);
  });
});

describe("hasCampusGroupsLink", () => {
  it("detects campusgroups and cglink", () => {
    assert.equal(hasCampusGroupsLink("https://cglink.me/foo"), true);
    assert.equal(hasCampusGroupsLink("plain text"), false);
  });
});

describe("hasUploadAfterEventHint", () => {
  it("detects selfie upload hint", () => {
    assert.equal(hasUploadAfterEventHint("upload a selfie after you attend"), true);
    assert.equal(hasUploadAfterEventHint("sign up now"), false);
  });
});

describe("buildWeekNoteParts", () => {
  it("includes html_url and outcome hint", () => {
    const parts = buildWeekNoteParts({
      source: "planner",
      sources: ["planner", "todo"],
      title: "Major Dinner",
      type: "assignment",
      description: '<a href="https://cglink.me/2vs/r385793">link</a>',
      html_url: "https://canvas.colorado.edu/courses/1/assignments/2",
    });
    const joined = parts.join("; ");
    assert.match(joined, /planner\+todo/);
    assert.match(joined, /signup-external/);
    assert.match(joined, /url:https:\/\/canvas\.colorado\.edu/);
  });
});

describe("mergeCourseFileContent registration log", () => {
  it("preserves registration log section", () => {
    const existing = `# COEN1500 — test

Updated: 2026-08-20

## Theme

-

## Registration log

- 2026-08-20: CS dinner — confirmed (event 385793)
`;
    const merged = mergeCourseFileContent({
      existingContent: existing,
      courseTitle: "COEN1500",
      catalogRows: [],
      today: "2026-08-22",
    });
    assert.match(merged, /## Registration log/);
    assert.match(merged, /event 385793/);
  });
});

describe("isCheckpoint", () => {
  it("includes thought projects and presentations", () => {
    assert.equal(
      isCheckpoint(
        "Thought Project #1: Your Personal Philosophy of Higher Education",
        "assignment"
      ),
      true
    );
    assert.equal(
      isCheckpoint("Advocate Version 1 (in-class presentation)", "assignment"),
      true
    );
  });

  it("excludes routine signups", () => {
    assert.equal(
      isCheckpoint("Assignment #1: Sign Up For Your Major Dinner", "assignment"),
      false
    );
  });
});

describe("shouldIncludeInWeekTable", () => {
  it("excludes recurring section calendar meetings", () => {
    assert.equal(
      shouldIncludeInWeekTable({
        title: "CSCI 1200 Fall 26 Section 800",
        type: "calendar_event",
      }),
      false
    );
  });

  it("keeps signup calendar events", () => {
    assert.equal(
      shouldIncludeInWeekTable({
        title: "Major Dinner Sign Up",
        type: "calendar_event",
      }),
      true
    );
  });

  it("filters non-actionable announcements", () => {
    assert.equal(
      shouldIncludeInWeekTable({
        title: "Answers/Lecture-video available and class reminders",
        type: "announcement",
        points: "",
      }),
      false
    );
  });
});

describe("dedupeRows", () => {
  it("merges planner and calendar rows by canvas id", () => {
    const merged = dedupeRows([
      {
        source: "planner",
        course: "CSCI 1200",
        title: "Lab 1",
        due: "2026-08-27T05:59:00Z",
        type: "assignment",
        course_id: "1",
        canvas_id: "99",
        complete: false,
      },
      {
        source: "calendar",
        course: "CSCI 1200",
        title: "Lab 1",
        due: "2026-08-27T05:59:00Z",
        type: "assignment",
        course_id: "1",
        canvas_id: "99",
        complete: false,
      },
    ]);
    assert.equal(merged.length, 1);
    assert.deepEqual(merged[0].sources.sort(), ["calendar", "planner"]);
  });
});

describe("resolveCourseFile", () => {
  const cases = [
    ["CSCI 1200: Intro Computational Thinking", "CSCI1200"],
    ["APPM 1235 Pre-Calculus", "APPM1235"],
    ["BCOR 1030 Communication Strategy", "BCOR1030"],
    ["COEN 1500 CEAS FYS", "COEN1500"],
    ["ECON 2010 Microeconomics", "ECON2010"],
    ["Calculus 1 Readiness Prep Course", "CALCREADY"],
    ["Online Experience (Summer/Fall 2026, TR)", "ONLINEEXP"],
  ];

  for (const [name, code] of cases) {
    it(`maps ${code}`, () => {
      const file = resolveCourseFile(name, "");
      assert.ok(file, `expected mapping for ${name}`);
      assert.match(file, new RegExp(`${code}\\.md$`));
    });
  }

  it("maps all JACOB courses in COURSE_FILE_MAP", () => {
    assert.equal(COURSE_FILE_MAP.length, 7);
  });
});

describe("stripHtmlTags and syllabusHash", () => {
  it("strips basic HTML to plain text", () => {
    const plain = stripHtmlTags("<p>Hello <strong>world</strong></p>");
    assert.match(plain, /Hello world/);
  });

  it("hashes syllabus text deterministically", () => {
    assert.equal(syllabusHash("abc"), syllabusHash("abc"));
    assert.notEqual(syllabusHash("abc"), syllabusHash("abcd"));
  });
});

describe("parseAgentPolicyFromSyllabus", () => {
  it("parses allow with allow_tools", () => {
    const p = parseAgentPolicyFromSyllabus(
      "agent_writes: allow\nallow_tools: submit_assignment\nnote: low-stakes only"
    );
    assert.equal(p.agentWrites, "allow");
    assert.deepEqual(p.allowTools, ["submit_assignment"]);
    assert.equal(p.note, "low-stakes only");
  });

  it("denies on conflicting agent_writes", () => {
    const p = parseAgentPolicyFromSyllabus("agent_writes: allow\nagent_writes: deny");
    assert.equal(p.agentWrites, "conflict");
  });

  it("returns no marker when absent", () => {
    const p = parseAgentPolicyFromSyllabus("Welcome to class.");
    assert.equal(p.hasMarker, false);
  });
});

describe("formatAgentPolicyNotes", () => {
  it("writes sync-owned notes when marker present", () => {
    const md = formatAgentPolicyNotes("agent_writes: deny\nnote: no AI", "2026-08-22");
    assert.match(md, /agent_writes: deny \(synced 2026-08-22\)/);
    assert.match(md, /note: no AI/);
  });
});

describe("filterPolicyPages", () => {
  it("matches policy-related page titles", () => {
    const pages = filterPolicyPages([
      { title: "Professionalism & Participation", url: "prof", published: true },
      { title: "Week 3 Lab", url: "lab", published: true },
    ]);
    assert.equal(pages.length, 1);
    assert.equal(pages[0].title, "Professionalism & Participation");
  });
});

describe("mergeCourseFileContent", () => {
  it("preserves agent instructor profile while updating policy pages", () => {
    const existing = `# CSCI1200 — Test

Updated: 2026-08-01

Sections: 800
Canvas URL: https://old.example
Primary instructor(s): Old Name
TA(s):
Syllabus hash: oldhash

## Theme

-

## Checkpoints

- (none)

## Assignment catalog

| Name | Due | Points | Type | Outcome | Status |
|------|-----|--------|------|---------|--------|
| | | | | | |

## Arc notes

- keep me

## Instructor profile

Profile updated: 2026-08-01

### Grading and weights

- Custom agent note (syllabus)

### Policy pages (synced)

- old page

## Syllabus / agent policy notes

-

## Modules / what's next

-

## Worth Jacob's time defaults

(See JACOB.md for this course.)
`;
    const md = mergeCourseFileContent({
      existingContent: existing,
      courseTitle: "CSCI 1200",
      catalogRows: [],
      today: "2026-08-22",
      syncMeta: {
        canvasUrl: "https://canvas.colorado.edu/courses/123",
        primaryInstructors: "K. Nielsen",
        syllabusHash: "newhash",
        syllabusPlain: "agent_writes: allow\nallow_tools: submit_assignment",
        policyPages: [{ title: "Syllabus", html_url: "https://canvas.example/pages/syllabus" }],
      },
    });
    assert.match(md, /Custom agent note \(syllabus\)/);
    assert.match(md, /Primary instructor\(s\): K\. Nielsen/);
    assert.match(md, /Syllabus hash: newhash/);
    assert.match(md, /- Syllabus — https:\/\/canvas\.example\/pages\/syllabus/);
    assert.match(md, /agent_writes: allow \(synced 2026-08-22\)/);
    assert.match(md, /allow_tools: submit_assignment/);
    assert.match(md, /- keep me/);
  });
});
