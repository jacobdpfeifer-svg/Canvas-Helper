import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addSchoolDays,
  aggregateToolInventory,
  buildWeekNoteParts,
  classifyOutcomeHint,
  classifyToolBucket,
  COURSE_FILE_MAP,
  dedupeRows,
  detectExternalTool,
  extractLinksFromHtml,
  filterPolicyPages,
  formatToolsSection,
  hasCampusGroupsLink,
  hasUploadAfterEventHint,
  isCheckpoint,
  schoolLocalDay,
  schoolMidnightUtc,
  filterDatedInWindow,
  mergeCourseFileContent,
  parseAgentPolicyFromSyllabus,
  formatAgentPolicyNotes,
  resolveCourseFile,
  shouldIncludeInWeekTable,
  stripHtmlTags,
  syllabusHash,
} from "../scripts/lib/canvas-session.mjs";
import {
  findConnector,
  hasConnector,
  listConnectorsForSchool,
} from "../scripts/lib/connector-registry.mjs";

describe("schoolMidnightUtc", () => {
  it("returns Denver midnight in August (MDT, UTC-6)", () => {
    const m = schoolMidnightUtc("2026-08-22");
    assert.equal(m.toISOString(), "2026-08-22T06:00:00.000Z");
    assert.equal(schoolLocalDay(m), "2026-08-22");
  });

  it("returns Denver midnight in January (MST, UTC-7)", () => {
    const m = schoolMidnightUtc("2026-01-15");
    assert.equal(m.toISOString(), "2026-01-15T07:00:00.000Z");
    assert.equal(schoolLocalDay(m), "2026-01-15");
  });
});

describe("addSchoolDays", () => {
  it("adds calendar days in Denver", () => {
    assert.equal(addSchoolDays("2026-08-22", 14), "2026-09-05");
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
    assert.match(hint, /bucket:B/);
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
    assert.match(hint, /bucket:B/);
    assert.match(hint, /tool:PlayPosit/);
  });

  it("tags graded external_tool without vendor name as Bucket B", () => {
    const hint = classifyOutcomeHint("Online homework portal", "external_tool", "", 10);
    assert.match(hint, /outcome:lti/);
    assert.match(hint, /bucket:B/);
  });

  it("tags ungraded admin external_tool as Bucket A", () => {
    const hint = classifyOutcomeHint("Course gradebook viewer", "external_tool", "", "");
    assert.match(hint, /outcome:external-admin/);
    assert.match(hint, /bucket:A/);
    assert.match(hint, /tool:Gradebook/);
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
    assert.match(hint, /bucket:A/);
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
    assert.match(merged, /## Tools this semester/);
  });

  it("writes tool inventory from catalog rows", () => {
    const merged = mergeCourseFileContent({
      existingContent: "",
      courseTitle: "PHYS1110",
      catalogRows: [
        {
          title: "HW1 PlayPosit",
          type: "assignment",
          due: "2026-09-01T12:00:00Z",
          points: 5,
        },
        {
          title: "Course gradebook viewer",
          type: "external_tool",
          due: "2026-08-25T12:00:00Z",
          points: "",
        },
      ],
      today: "2026-08-22",
    });
    assert.match(merged, /## Tools this semester/);
    assert.match(merged, /PlayPosit/);
    assert.match(merged, /\|\s*B\s*\|/);
    assert.match(merged, /Gradebook/);
    assert.match(merged, /\|\s*A\s*\|/);
  });
});

describe("detectExternalTool and buckets", () => {
  it("classifies assessment keywords as Bucket B with no override path", () => {
    assert.equal(classifyToolBucket("ZyBooks Ch 2", "assignment"), "B");
    assert.equal(detectExternalTool("Honorlock quiz", "assignment")?.slug, "honorlock");
  });

  it("classifies CampusGroups as Bucket A", () => {
    const tool = detectExternalTool(
      "Major Dinner",
      "assignment",
      '<a href="https://cglink.me/2vs/r1">RSVP</a>'
    );
    assert.equal(tool?.bucket, "A");
    assert.equal(tool?.slug, "campusgroups");
  });

  it("aggregates inventory counts and preserves first-seen", () => {
    const inventory = aggregateToolInventory(
      [
        {
          title: "PlayPosit 1",
          type: "assignment",
          due: "2026-09-10T00:00:00Z",
          points: 1,
        },
        {
          title: "PlayPosit 2",
          type: "assignment",
          due: "2026-09-20T00:00:00Z",
          points: 1,
        },
      ],
      {
        existingSection:
          "| Tool | Bucket | Count | First seen |\n| PlayPosit | B | 1 | 2026-08-01 |",
        today: "2026-09-01",
      }
    );
    assert.equal(inventory.length, 1);
    assert.equal(inventory[0].count, 2);
    assert.equal(inventory[0].firstSeen, "2026-08-01");
    assert.match(formatToolsSection(inventory), /PlayPosit/);
  });
});

describe("connector registry", () => {
  it("lists CampusGroups for cu-boulder and rejects unknown tools", () => {
    const listed = listConnectorsForSchool("cu-boulder");
    assert.ok(listed.some((c) => c.slug === "campusgroups"));
    assert.equal(hasConnector("campusgroups", "cu-boulder"), true);
    assert.equal(hasConnector("gradebook", "cu-boulder"), false);
    assert.equal(findConnector("webassign", "cu-boulder"), null);
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
  it("shipping cu-boulder course_file_map is empty", () => {
    assert.equal(COURSE_FILE_MAP.length, 0);
  });

  it("falls back to Canvas course_code slug when map is empty", () => {
    const file = resolveCourseFile("Intro Computational Thinking", "CSCI 1200");
    assert.ok(file);
    assert.match(file, /CSCI1200\.md$/);
  });

  it("returns null when no map hit and no usable course_code", () => {
    assert.equal(resolveCourseFile("Mystery Seminar", ""), null);
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

## Worth your time defaults

(See USER.md for this course.)
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

  it("preserves skill-owned Weak topics section", () => {
    const existing = `# MATH2300 — Calc

Updated: 2026-08-01

Sections: 001
Canvas URL:
Primary instructor(s):
TA(s):
Syllabus hash:

## Theme

-

## Checkpoints

- (none)

## Assignment catalog

| Name | Due | Points | Type | Outcome | Status |
|------|-----|--------|------|---------|--------|
| | | | | | |

## Arc notes

-

## Weak topics

- \`tangent_line\` — Tangent Lines Quiz — 0.55 (2026-09-06)

## Instructor profile

-

## Syllabus / agent policy notes

-

## Modules / what's next

-

## Worth your time defaults

(See USER.md for this course.)
`;
    const md = mergeCourseFileContent({
      existingContent: existing,
      courseTitle: "MATH 2300",
      catalogRows: [],
      today: "2026-09-06",
    });
    assert.match(md, /## Weak topics/);
    assert.match(md, /`tangent_line` — Tangent Lines Quiz — 0\.55/);
  });
});
