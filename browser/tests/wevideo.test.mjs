/**
 * Unit tests for WeVideo helpers (no live Canvas).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isWeVideoUrl, isWeVideoToolAttrs, courseCodeFromCanvasUrl } from "../scripts/lib/wevideo/urls.mjs";
import { solveQuestion } from "../scripts/lib/wevideo/solver.mjs";

describe("wevideo urls", () => {
  it("detects playposit and wevideo hosts", () => {
    assert.equal(isWeVideoUrl("https://www.playposit.com/LTI13/launch"), true);
    assert.equal(
      isWeVideoUrl("https://www.wevideo.com/interactive/player_v2?assignmentId=1"),
      true
    );
    assert.equal(isWeVideoUrl("https://www.webassign.net/foo"), false);
  });

  it("detects tool attrs", () => {
    assert.equal(
      isWeVideoToolAttrs({
        url: "https://www.playposit.com/LTI/launch/868417/play2",
        new_tab: true,
      }),
      true
    );
  });

  it("maps known course ids", () => {
    assert.equal(
      courseCodeFromCanvasUrl("https://canvas.colorado.edu/courses/21463/assignments/1"),
      "LEEDSFYE"
    );
    assert.equal(
      courseCodeFromCanvasUrl("https://canvas.colorado.edu/courses/141523/assignments/1"),
      "BCOR1030"
    );
  });
});

describe("wevideo solver heuristic", () => {
  it("picks transcript-aligned MC option", async () => {
    process.env.WEVIDEO_NO_WEB = "1";
    delete process.env.OPENAI_API_KEY;
    const r = await solveQuestion({
      type: "multiple_choice",
      stem: "What is the primary focus of marketing?",
      options: ["Accounting ledgers", "Understanding customers", "Building bridges"],
      transcript:
        "Meg explains that marketing starts with understanding customers and their needs before any campaign.",
      courseCode: "LEEDSFYE",
    });
    assert.equal(r.choiceIndexes[0], 1);
    assert.equal(r.source, "heuristic");
  });

  it("returns free-response text from transcript", async () => {
    process.env.WEVIDEO_NO_WEB = "1";
    const r = await solveQuestion({
      type: "free_response",
      stem: "Summarize the speaker's main point.",
      options: [],
      transcript:
        "The speaker emphasized that branding is about trust over time and consistent messaging across channels.",
      courseCode: "LEEDSFYE",
    });
    assert.ok(r.text && r.text.length > 20);
  });
});
