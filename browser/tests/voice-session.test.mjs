import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { VoiceSession, describeError } from "../scripts/lib/voice/session.mjs";
import { TranscriptRecorder } from "../scripts/lib/voice/transcript.mjs";
import { createFakeLive, settle } from "./helpers/fake-live.mjs";

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-session-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

function harness(fakeOpts, toolHandle, sessionOpts = {}) {
  const fake = createFakeLive(fakeOpts);
  const events = [];
  const audio = [];
  const session = new VoiceSession({
    connectLive: fake.connectLive,
    buildConfig: ({ handle }) => ({ handle }),
    tools: {
      handle:
        toolHandle ||
        (async (name, args) => ({ ok: true, saved: "goal", category: args.category, statement: args.statement })),
    },
    recorder: new TranscriptRecorder({ id: "s1", mode: "goals" }),
    sessionsDir: path.join(dir, "sessions"),
    kickoff: "KICKOFF",
    emit: (m) => events.push(m),
    emitAudio: (b) => audio.push(b),
    log: { warn() {} },
    ...sessionOpts,
  });
  const types = () => events.map((e) => e.type);
  return { fake, events, audio, session, types };
}

describe("VoiceSession start", () => {
  it("announces ready and sends the kickoff exactly once", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    assert.deepEqual(h.types(), ["ready"]);
    assert.deepEqual(h.fake.connections[0].sent, [{ text: "KICKOFF" }]);
  });

  it("still becomes ready when setupComplete arrives before connect() resolves", async () => {
    const h = harness({ setupBeforeResolve: true });
    await h.session.start();
    await settle();
    assert.deepEqual(h.types(), ["ready"]);
    assert.deepEqual(h.fake.connections[0].sent, [{ text: "KICKOFF" }]);
  });

  it("propagates a connect failure so the server can report it", async () => {
    const h = harness({ failWith: new Error("models/x is not found") });
    await assert.rejects(h.session.start(), /not found/);
  });
});

describe("VoiceSession failed or slow connects", () => {
  it("does not hang when setup fails with only onclose (what the SDK does on a bad API key)", async () => {
    const h = harness({ hangAndClose: { code: 1007, reason: "API key not valid. Please pass a valid API key." } });
    await h.session.start(); // must settle even though connectLive never does
    const err = h.events.find((e) => e.type === "error");
    assert.match(err.message, /GEMINI_API_KEY/);
    assert.equal(h.types().at(-1), "closed");
  });

  it("rejects when connecting takes longer than the timeout", async () => {
    const h = harness({ delayMs: 300 }, undefined, { connectTimeoutMs: 30 });
    await assert.rejects(h.session.start(), /Timed out/);
    await h.session.stop("start failed");
    await new Promise((r) => setTimeout(r, 350));
    assert.equal(h.fake.connections[0].closed, true); // the late connection is closed, not leaked
  });

  it("closes a connection that finishes opening after stop()", async () => {
    const h = harness({ delayMs: 80 });
    const starting = h.session.start();
    await h.session.stop("stopped by user");
    await starting; // resolves quietly once stopped
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(h.fake.connections.length, 1);
    assert.equal(h.fake.connections[0].closed, true);
    assert.deepEqual(h.fake.connections[0].sent, []); // no kickoff into a dead session
  });
});

describe("VoiceSession audio and transcripts", () => {
  it("forwards mic frames as base64 PCM16 @16k", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    h.session.sendAudio(Buffer.from([1, 2, 3, 4]));
    assert.deepEqual(h.fake.connections[0].sent.at(-1), {
      audio: { data: Buffer.from([1, 2, 3, 4]).toString("base64"), mimeType: "audio/pcm;rate=16000" },
    });
  });

  it("relays model audio, transcripts, and interruptions to the client", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    const conn = h.fake.connections[0];
    conn.emit({ serverContent: { inputTranscription: { text: "I want to " } } });
    conn.emit({ serverContent: { inputTranscription: { text: "start something." } } });
    conn.emit({
      serverContent: {
        outputTranscription: { text: "Why?" },
        modelTurn: { parts: [{ inlineData: { data: Buffer.from([9, 8]).toString("base64"), mimeType: "audio/pcm;rate=24000" } }] },
      },
    });
    conn.emit({ serverContent: { interrupted: true } });
    assert.deepEqual(h.audio, [Buffer.from([9, 8])]);
    assert.deepEqual(h.events.filter((e) => e.type === "transcript").map((e) => [e.role, e.text]), [
      ["user", "I want to "],
      ["user", "start something."],
      ["model", "Why?"],
    ]);
    assert.ok(h.types().includes("interrupted"));
  });

  it("persists the transcript at each completed turn", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    const conn = h.fake.connections[0];
    conn.emit({ serverContent: { inputTranscription: { text: "hello there" } } });
    conn.emit({ serverContent: { outputTranscription: { text: "hi Jacob" }, turnComplete: true } });
    const md = fs.readFileSync(path.join(dir, "sessions", "s1.md"), "utf8");
    assert.match(md, /\*\*Jacob:\*\* hello there\n\n\*\*Interviewer:\*\* hi Jacob/);
  });

  it("records typed messages as Jacob's words", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    h.session.sendText("  typed thought ");
    assert.deepEqual(h.fake.connections[0].sent.at(-1), { text: "typed thought" });
    assert.equal(h.session.recorder.entries.at(-1).text, "typed thought");
  });
});

describe("VoiceSession tool calls", () => {
  it("runs the tool, answers with matching id/name, tells the client, and counts the capture", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    const conn = h.fake.connections[0];
    conn.emit({
      toolCall: { functionCalls: [{ id: "c1", name: "save_goal", args: { category: "career", statement: "build a company" } }] },
    });
    await settle();
    assert.deepEqual(conn.toolResponses, [
      {
        functionResponses: [
          { id: "c1", name: "save_goal", response: { ok: true, saved: "goal", category: "career", statement: "build a company" } },
        ],
      },
    ]);
    const tool = h.events.find((e) => e.type === "tool");
    assert.equal(tool.name, "save_goal");
    assert.equal(h.session.recorder.captures, 1);
    assert.match(h.session.recorder.entries.at(-1).text, /saved goal \[career\]: build a company/);
  });

  it("reports a failing tool back to the model instead of crashing the session", async () => {
    const h = harness({}, async () => ({ ok: false, error: "category must be one of: career" }));
    await h.session.start();
    await settle();
    const conn = h.fake.connections[0];
    conn.emit({ toolCall: { functionCalls: [{ id: "c1", name: "save_goal", args: {} }] } });
    await settle();
    assert.equal(conn.toolResponses[0].functionResponses[0].response.ok, false);
    assert.equal(h.session.recorder.captures, 0);
    assert.match(h.session.recorder.entries.at(-1).text, /failed: category must be one of/);
  });
});

describe("VoiceSession resume", () => {
  it("reconnects with the resumption handle on goAway, without re-sending the kickoff", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    const first = h.fake.connections[0];
    first.emit({ sessionResumptionUpdate: { resumable: true, newHandle: "H1" } });
    first.emit({ goAway: { timeLeft: "30s" } });
    await settle();
    assert.equal(h.fake.connections.length, 2);
    assert.deepEqual(h.fake.connections[1].config, { handle: "H1" });
    assert.equal(first.closed, true);
    assert.deepEqual(h.types().filter((t) => ["reconnecting", "resumed"].includes(t)), ["reconnecting", "resumed"]);
    assert.deepEqual(h.fake.connections[1].sent, []); // no second kickoff
    h.session.sendAudio(Buffer.from([1, 2]));
    assert.equal(h.fake.connections[1].sent.length, 1); // audio now flows to the new connection
  });

  it("ignores late callbacks from the connection it replaced", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    const first = h.fake.connections[0];
    first.emit({ sessionResumptionUpdate: { resumable: true, newHandle: "H1" } });
    first.emit({ goAway: {} });
    await settle();
    const before = h.events.length;
    first.callbacks.onclose({ code: 1006 });
    first.emit({ serverContent: { outputTranscription: { text: "ghost" } } });
    await settle();
    assert.equal(h.events.length, before);
  });

  it("does not resume without a handle", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    h.fake.connections[0].emit({ goAway: { timeLeft: "5s" } });
    await settle();
    assert.equal(h.fake.connections.length, 1);
  });

  it("resumes after an unexpected close when it has a handle", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    h.fake.connections[0].emit({ sessionResumptionUpdate: { resumable: true, newHandle: "H2" } });
    h.fake.connections[0].callbacks.onclose({ code: 1011, reason: "boom" });
    await settle();
    assert.equal(h.fake.connections.length, 2);
    assert.equal(h.fake.connections[1].config.handle, "H2");
  });

  it("ends the session with an error when the connection dies and it cannot resume", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    h.fake.connections[0].callbacks.onclose({ code: 1008, reason: "models/x is not found" });
    await settle();
    const err = h.events.find((e) => e.type === "error");
    assert.match(err.message, /npm run voice-models/);
    assert.equal(h.types().at(-1), "closed");
  });
});

describe("VoiceSession stop", () => {
  it("closes the connection, saves the transcript, and is idempotent", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    const conn = h.fake.connections[0];
    conn.emit({ serverContent: { inputTranscription: { text: "bye" } } });
    const res = await h.session.stop("stopped by user");
    assert.equal(conn.closed, true);
    assert.ok(conn.sent.some((m) => m.audioStreamEnd));
    assert.equal(path.basename(res.file), "s1.md");
    assert.match(fs.readFileSync(res.file, "utf8"), /\*\*Jacob:\*\* bye/);
    assert.equal(await h.session.stop(), res);
    assert.equal(h.types().filter((t) => t === "closed").length, 1);
  });

  it("writes no file when nothing was said", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    const res = await h.session.stop();
    assert.equal(res.file, null);
    assert.equal(fs.existsSync(path.join(dir, "sessions")), false);
  });

  it("drops mic audio after stop", async () => {
    const h = harness();
    await h.session.start();
    await settle();
    const conn = h.fake.connections[0];
    await h.session.stop();
    const sent = conn.sent.length;
    h.session.sendAudio(Buffer.from([1, 2]));
    assert.equal(conn.sent.length, sent);
  });
});

describe("describeError", () => {
  it("points model problems at voice-models and key problems at .env", () => {
    assert.match(describeError(new Error("404 model not found")), /npm run voice-models/);
    assert.match(describeError("API key not valid"), /GEMINI_API_KEY/);
    assert.equal(describeError(new Error("weird")), "weird");
  });
});
