import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { pruneRuns, runActionPlan, validatePlan } from "../scripts/lib/action-runner.mjs";
import {
  checkExpectedEvent,
  describeRsvpOutcome,
  dropPastRows,
  rsvpLaunchFailure,
  rsvpResultFromRun,
  runRsvpCli,
  shellQuote,
  upsertRegistrationLogLine,
} from "../scripts/lib/campusgroups-session.mjs";
import { CONNECTOR_REGISTRY, assertRegistryShape } from "../scripts/lib/connector-registry.mjs";

/** Minimal Playwright-shaped page: url/title/screenshot + a navigable location. */
function fakePage(start = "https://example.test/start") {
  const page = {
    location: start,
    shots: 0,
    url: () => page.location,
    title: async () => `title of ${page.location}`,
    screenshot: async () => {
      page.shots++;
      return Buffer.from("png");
    },
  };
  return page;
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "action-runner-"));
}

const pass = { name: "done", finish: true, check: () => ({ ok: true }) };
const failFinish = { name: "done", finish: true, check: () => ({ ok: false }) };

describe("validatePlan", () => {
  it("refuses a plan with no finish step", () => {
    assert.throws(() => validatePlan([{ name: "a" }]), /exactly one finish/);
  });
  it("refuses a finish step that is not last", () => {
    assert.throws(() => validatePlan([{ ...pass }, { name: "b" }]), /finish step must be the last/);
  });
  it("refuses a finish step without a check", () => {
    assert.throws(() => validatePlan([{ name: "a", finish: true }]), /needs a check/);
  });
  it("refuses duplicate names", () => {
    assert.throws(() => validatePlan([{ name: "done" }, pass]), /duplicate/);
  });
});

describe("runActionPlan", () => {
  it("refuses an invalid plan before any step acts", async () => {
    let acted = false;
    await assert.rejects(
      runActionPlan(fakePage(), {
        label: "t",
        diagnosticsDir: null,
        steps: [{ name: "write", act: async () => (acted = true) }],
      })
    );
    assert.equal(acted, false);
  });

  it("checks against a fresh post-act observation", async () => {
    const seen = [];
    const run = await runActionPlan(fakePage(), {
      label: "fresh",
      diagnosticsDir: null,
      steps: [
        {
          name: "go",
          act: async (p) => (p.location = "https://example.test/next"),
          check: (_p, ctx) => {
            seen.push(ctx.observation.url);
            return { ok: true };
          },
        },
        { name: "done", finish: true, check: (_p, ctx) => ({ ok: ctx.observation.url.endsWith("/next") }) },
      ],
    });
    assert.deepEqual(seen, ["https://example.test/next"]);
    assert.equal(run.ok, true);
    assert.equal(run.finished, true);
  });

  it("halts on a failed check and never runs later steps", async () => {
    let laterRan = false;
    const run = await runActionPlan(fakePage(), {
      label: "halt",
      diagnosticsDir: null,
      steps: [
        { name: "session", check: () => ({ ok: false, detail: "not logged in" }) },
        { name: "write", act: async () => (laterRan = true) },
        pass,
      ],
    });
    assert.equal(laterRan, false);
    assert.equal(run.ok, false);
    assert.equal(run.finished, false);
    assert.equal(run.haltedAt, "session");
  });

  it("halts on a thrown act and records the error", async () => {
    const run = await runActionPlan(fakePage(), {
      label: "throw",
      diagnosticsDir: null,
      steps: [
        { name: "rsvp", act: async () => { throw new Error("Register button not found"); } },
        pass,
      ],
    });
    assert.equal(run.ok, false);
    assert.equal(run.haltedAt, "rsvp");
    assert.match(run.steps[0].act.error, /Register button not found/);
  });

  it("a failing finish check is finished but not ok", async () => {
    const run = await runActionPlan(fakePage(), {
      label: "verdict",
      diagnosticsDir: null,
      steps: [{ name: "verify", finish: true, check: () => ({ ok: false, detail: { method: "none" } }) }],
    });
    assert.equal(run.finished, true);
    assert.equal(run.ok, false);
    assert.deepEqual(run.verdict, { ok: false, detail: { method: "none" } });
  });

  it("a successful run keeps run.json but writes no screenshots (default on-failure)", async () => {
    const dir = tmpDir();
    const page = fakePage();
    const run = await runActionPlan(page, {
      label: "ok-run",
      diagnosticsDir: dir,
      meta: { eventId: "7" },
      steps: [{ name: "one", act: async () => ({ a: 1, page }) }, pass],
    });
    assert.equal(run.ok, true);
    assert.equal(page.shots, 2, "still observes every step");
    const files = fs.readdirSync(run.diagnostics);
    assert.deepEqual(files, ["run.json"]);
    const saved = JSON.parse(fs.readFileSync(path.join(run.diagnostics, "run.json"), "utf8"));
    assert.equal(saved.meta.eventId, "7");
    assert.equal(saved.steps[0].observation.screenshot, null);
    assert.equal(run.lastScreenshot, null);
    // Circular page handle in the act result must not break serialization.
    assert.equal(saved.steps[0].act.ok, true);
  });

  it("a failed run writes every step's screenshot and points at the last one", async () => {
    const dir = tmpDir();
    const run = await runActionPlan(fakePage(), {
      label: "bad-run",
      diagnosticsDir: dir,
      steps: [{ name: "one" }, failFinish],
    });
    assert.equal(run.ok, false);
    const files = fs.readdirSync(run.diagnostics).sort();
    assert.deepEqual(files, ["run.json", "step-01-one.png", "step-02-done.png"]);
    assert.equal(run.lastScreenshot, path.join(run.diagnostics, "step-02-done.png"));
  });

  it("screenshots: 'never' captures nothing even on failure", async () => {
    const page = fakePage();
    const run = await runActionPlan(page, {
      label: "never",
      diagnosticsDir: tmpDir(),
      screenshots: "never",
      steps: [failFinish],
    });
    assert.equal(page.shots, 0);
    assert.deepEqual(fs.readdirSync(run.diagnostics), ["run.json"]);
  });

  it("defaults diagnostics to {user_root}/diagnostics, not inbox/", async () => {
    const root = tmpDir();
    const prev = process.env.DEV_USER_ROOT;
    process.env.DEV_USER_ROOT = root;
    try {
      const run = await runActionPlan(fakePage(), { label: "where", steps: [pass] });
      assert.ok(run.diagnostics.startsWith(path.join(root, "diagnostics") + path.sep));
      assert.equal(fs.existsSync(path.join(root, "inbox", "diagnostics")), false);
    } finally {
      if (prev === undefined) delete process.env.DEV_USER_ROOT;
      else process.env.DEV_USER_ROOT = prev;
    }
  });
});

describe("pruneRuns", () => {
  it("keeps only the newest runs for a label and leaves other labels alone", () => {
    const dir = tmpDir();
    for (const s of ["1", "2", "3", "4"]) fs.mkdirSync(path.join(dir, `lbl-2026-09-29T00-00-0${s}`));
    fs.mkdirSync(path.join(dir, "lbl-extra-2026-09-29T00-00-00"));
    pruneRuns(dir, "lbl", 2);
    const left = fs.readdirSync(dir).sort();
    assert.deepEqual(left, [
      "lbl-2026-09-29T00-00-03",
      "lbl-2026-09-29T00-00-04",
      "lbl-extra-2026-09-29T00-00-00",
    ]);
  });
});

describe("connector registry surface guard", () => {
  const base = { id: "x/y", school: "x", slug: "y", name: "Y", bucket: "A", pluginDir: "plugins/x" };

  it("accepts the shipped registry", () => {
    assert.doesNotThrow(() => assertRegistryShape(CONNECTOR_REGISTRY));
  });
  it("refuses a device-automation surface", () => {
    assert.throws(() => assertRegistryShape([{ ...base, surface: "device" }]), /rule 7/);
  });
  it("refuses an entry with no surface", () => {
    assert.throws(() => assertRegistryShape([{ ...base }]), /not allowed/);
  });
  it("refuses Bucket B", () => {
    assert.throws(() => assertRegistryShape([{ ...base, bucket: "B", surface: "web" }]), /Bucket A/);
  });
});

/** Build a runner-shaped result for RSVP outcome tests. */
function rsvpRun({ haltedAt = null, sessionOk = true, rsvpAct, verify } = {}) {
  const steps = [
    { step: "session", act: { ok: true }, check: { ok: sessionOk }, observation: { url: "u1" } },
  ];
  if (sessionOk && rsvpAct) {
    steps.push({ step: "rsvp", act: rsvpAct, check: rsvpAct.ok ? { ok: true } : null, observation: { url: "u2" } });
  }
  if (verify) {
    steps.push({ step: "verify", act: { ok: true }, check: verify, observation: { url: "u3" } });
  }
  const verdict = verify || null;
  return {
    ok: !haltedAt && !!verdict?.ok,
    finished: !!verdict,
    haltedAt,
    verdict,
    steps,
    diagnostics: "/d",
    lastScreenshot: haltedAt ? "/d/last.png" : null,
  };
}

const clicked = { ok: true, result: { registered: true, alreadyRegistered: false } };

describe("describeRsvpOutcome", () => {
  it("expired session → not_attempted with the login fix", () => {
    const d = describeRsvpOutcome(rsvpRun({ haltedAt: "session", sessionOk: false }));
    assert.equal(d.outcome, "not_attempted");
    assert.match(d.next, /open-campusgroups/);
  });
  it("no Register button → not_attempted", () => {
    const d = describeRsvpOutcome(
      rsvpRun({ haltedAt: "rsvp", rsvpAct: { ok: false, error: "Register button not found on RSVP page for event 1" } })
    );
    assert.equal(d.outcome, "not_attempted");
  });
  it("unknown throw in the rsvp step → unconfirmed (can't rule out the click)", () => {
    const d = describeRsvpOutcome(rsvpRun({ haltedAt: "rsvp", rsvpAct: { ok: false, error: "Timeout 60000ms" } }));
    assert.equal(d.outcome, "unconfirmed");
  });
  it("clicked but verify failed → unconfirmed, says retry is safe", () => {
    const d = describeRsvpOutcome(
      rsvpRun({ haltedAt: "verify", rsvpAct: clicked, verify: { ok: false, detail: { method: "none" } } }),
      { eventUrl: "https://e/1" }
    );
    assert.equal(d.outcome, "unconfirmed");
    assert.match(d.next, /My Events/);
    assert.match(d.next, /Retrying is safe/);
    assert.match(d.next, /https:\/\/e\/1/);
  });
  it("verify skipped → registered_unverified", () => {
    const d = describeRsvpOutcome(
      rsvpRun({ rsvpAct: clicked, verify: { ok: true, detail: { success: true, method: "skipped" } } })
    );
    assert.equal(d.outcome, "registered_unverified");
  });
  it("already registered → already_registered", () => {
    const d = describeRsvpOutcome(
      rsvpRun({
        rsvpAct: { ok: true, result: { registered: true, alreadyRegistered: true } },
        verify: { ok: true, detail: { success: true } },
      })
    );
    assert.equal(d.outcome, "already_registered");
  });
  it("verified → confirmed", () => {
    const d = describeRsvpOutcome(rsvpRun({ rsvpAct: clicked, verify: { ok: true, detail: { success: true } } }));
    assert.equal(d.outcome, "confirmed");
  });
});

describe("rsvpResultFromRun", () => {
  it("keeps the old CLI fields and adds outcome + failure screenshot", () => {
    const out = rsvpResultFromRun(
      rsvpRun({ haltedAt: "rsvp", rsvpAct: { ok: false, error: "boom" } }),
      42,
      { event: { label: "X" } }
    );
    assert.equal(out.ok, false);
    assert.equal(out.eventId, "42");
    assert.equal(out.alreadyRegistered, false);
    assert.deepEqual(out.verification, { success: false, method: "none" });
    assert.equal(out.url, "u2");
    assert.equal(out.diagnostics, "/d");
    assert.equal(out.haltedAt, "rsvp");
    assert.equal(out.error, "boom");
    assert.equal(out.screenshot, "/d/last.png");
    assert.equal(out.outcome, "unconfirmed");
    assert.deepEqual(out.event, { label: "X" });
  });
});

describe("checkExpectedEvent", () => {
  const previewCommand = "npm run rsvp-dinner -- --name A";
  it("passes when not required and absent", () => {
    assert.equal(checkExpectedEvent({ resolvedId: 1, expect: null, required: false, previewCommand }), null);
  });
  it("refuses when required and absent", () => {
    const r = checkExpectedEvent({ resolvedId: 1, expect: null, required: true, previewCommand });
    assert.equal(r.outcome, "not_attempted");
    assert.match(r.next, /rsvp-dinner/);
  });
  it("refuses on drift", () => {
    const r = checkExpectedEvent({ resolvedId: 2, expect: "1", required: true, previewCommand });
    assert.match(r.message, /preview was for event 1.*resolves to event 2/);
  });
  it("passes on match", () => {
    assert.equal(checkExpectedEvent({ resolvedId: 2, expect: "2", required: true, previewCommand }), null);
  });
});

describe("rsvpLaunchFailure", () => {
  it("names a concurrent sync plainly", () => {
    const r = rsvpLaunchFailure(new Error("another Canvas browser script (pid 9) owns /x; wait"), 5);
    assert.equal(r.outcome, "not_attempted");
    assert.match(r.message, /Another Canvas sync/);
  });
});

describe("runRsvpCli", () => {
  const baseOpts = {
    eventId: "222",
    studentName: "Test Student",
    verify: true,
    confirm: true,
    expect: "222",
    expectRequired: true,
    event: { label: "CS dinner", date: "2026-10-08" },
    previewCommand: "npm run rsvp-dinner -- --name 'Test Student'",
    confirmCommand: "npm run rsvp-dinner -- --name 'Test Student' --expect 222 --confirm",
    log: true,
  };
  const neverLaunch = async () => {
    throw new Error("must not launch a browser");
  };
  function fakeLaunch() {
    const state = { closed: false };
    return {
      state,
      launch: async () => ({ page: fakePage(), context: { close: async () => (state.closed = true) } }),
    };
  }

  it("without --confirm returns a preview and never opens a browser", async () => {
    const { result, exitCode } = await runRsvpCli({ ...baseOpts, confirm: false }, { launch: neverLaunch });
    assert.equal(exitCode, 0);
    assert.equal(result.outcome, "preview");
    assert.equal(result.registered, false);
    assert.equal(result.confirmWith, baseOpts.confirmCommand);
  });

  it("refuses a drifted --expect before opening a browser", async () => {
    const { result, exitCode } = await runRsvpCli({ ...baseOpts, expect: "333" }, { launch: neverLaunch });
    assert.equal(exitCode, 1);
    assert.equal(result.outcome, "not_attempted");
  });

  it("turns a profile-lock failure into a plain not_attempted", async () => {
    const { result, exitCode } = await runRsvpCli(baseOpts, {
      launch: async () => {
        throw new Error("another Canvas browser script (pid 1) owns /a");
      },
    });
    assert.equal(exitCode, 1);
    assert.match(result.next, /Wait for the sync/);
  });

  it("confirmed → logs confirmed, exit 0, closes the browser", async () => {
    const fl = fakeLaunch();
    const logged = [];
    const { result, exitCode } = await runRsvpCli(baseOpts, {
      launch: fl.launch,
      runFlow: async () => rsvpRun({ rsvpAct: clicked, verify: { ok: true, detail: { success: true } } }),
      appendLog: (e) => logged.push(e),
    });
    assert.equal(exitCode, 0);
    assert.equal(result.outcome, "confirmed");
    assert.equal(fl.state.closed, true);
    assert.deepEqual(logged, [{ label: "CS dinner", date: "2026-10-08", eventId: "222", status: "confirmed" }]);
  });

  it("--no-verify → logs unverified, never 'confirmed'", async () => {
    const fl = fakeLaunch();
    const logged = [];
    await runRsvpCli(
      { ...baseOpts, verify: false },
      {
        launch: fl.launch,
        runFlow: async () =>
          rsvpRun({ rsvpAct: clicked, verify: { ok: true, detail: { success: true, method: "skipped" } } }),
        appendLog: (e) => logged.push(e),
      }
    );
    assert.equal(logged[0].status, "unverified");
  });

  it("unconfirmed → no log, exit 1, browser still closed", async () => {
    const fl = fakeLaunch();
    const logged = [];
    const { result, exitCode } = await runRsvpCli(baseOpts, {
      launch: fl.launch,
      runFlow: async () =>
        rsvpRun({ haltedAt: "verify", rsvpAct: clicked, verify: { ok: false, detail: { method: "none" } } }),
      appendLog: (e) => logged.push(e),
    });
    assert.equal(exitCode, 1);
    assert.equal(result.outcome, "unconfirmed");
    assert.deepEqual(logged, []);
    assert.equal(fl.state.closed, true);
  });

  it("a crash inside the flow reports unconfirmed, not success", async () => {
    const fl = fakeLaunch();
    const { result, exitCode } = await runRsvpCli(baseOpts, {
      launch: fl.launch,
      runFlow: async () => {
        throw new Error("page crashed");
      },
      appendLog: () => assert.fail("must not log"),
    });
    assert.equal(exitCode, 1);
    assert.equal(result.outcome, "unconfirmed");
    assert.equal(fl.state.closed, true);
  });
});

describe("upsertRegistrationLogLine", () => {
  const doc = "# COEN1500\n\n## Registration log\n\n- 2026-09-28: CS — unverified (event 222)\n\n## Next\n";
  it("upgrades an unverified line to confirmed", () => {
    const out = upsertRegistrationLogLine(doc, "- 2026-09-29: CS — confirmed (event 222)", "222");
    assert.match(out, /confirmed \(event 222\)/);
    assert.doesNotMatch(out, /unverified/);
  });
  it("never downgrades or duplicates", () => {
    const confirmed = doc.replace("unverified", "confirmed");
    assert.equal(upsertRegistrationLogLine(confirmed, "- x — unverified (event 222)", "222"), confirmed);
    assert.equal(upsertRegistrationLogLine(confirmed, "- x — confirmed (event 222)", "222"), confirmed);
  });
  it("adds the section when missing", () => {
    assert.match(upsertRegistrationLogLine("# C\n", "- a — confirmed (event 1)", "1"), /## Registration log\n\n- a/);
  });
});

describe("dropPastRows / shellQuote", () => {
  it("drops past ISO dates, keeps today, future, and unparseable dates", () => {
    const rows = [{ date: "2026-09-28" }, { date: "2026-09-29" }, { date: "2026-10-01" }, { date: "Sept 10" }];
    assert.deepEqual(
      dropPastRows(rows, "2026-09-29").map((r) => r.date),
      ["2026-09-29", "2026-10-01", "Sept 10"]
    );
  });
  it("quotes names safely for a copy-paste command", () => {
    assert.equal(shellQuote("cs"), "cs");
    assert.equal(shellQuote("Test Student"), "'Test Student'");
    assert.equal(shellQuote("O'Brien"), `'O'\\''Brien'`);
  });
});
