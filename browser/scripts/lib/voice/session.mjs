/**
 * One voice session: browser audio ⇄ Gemini Live, tool calls → local markdown,
 * transcript → inbox/voice/sessions. SDK-free (Live is injected via `connectLive`).
 */
import { INPUT_SAMPLE_RATE } from "./config.mjs";

/** Turn a connection/setup failure into something Jacob can act on. */
export function describeError(err) {
  const msg = err instanceof Error ? err.message : String(err ?? "unknown error");
  if (/not found|not supported|invalid.*model|\b404\b/i.test(msg)) {
    return `${msg} — that model may be retired or not enabled for your key. Run \`npm run voice-models\` and set GEMINI_LIVE_MODEL.`;
  }
  if (/api key|permission|unauth|\b40[13]\b/i.test(msg)) {
    return `${msg} — check GEMINI_API_KEY in the repo-root .env.`;
  }
  return msg;
}

function summarizeTool(name, args, result) {
  if (!result?.ok) return `tool ${name} failed: ${result?.error || "unknown error"}`;
  if (name === "save_goal") return `saved goal [${result.category}]: ${result.statement}`;
  if (name === "append_class_note") return `saved class note ${result.course_code}: ${result.note}`;
  return `tool ${name} ok`;
}

export class VoiceSession {
  /**
   * @param {{
   *   connectLive: (p: { config: object, callbacks: object }) => Promise<any>,
   *   buildConfig: (p: { handle?: string }) => object,
   *   tools: { handle: (name: string, args?: object) => Promise<object> },
   *   recorder: import("./transcript.mjs").TranscriptRecorder,
   *   sessionsDir: string,
   *   kickoff: string,
   *   emit: (msg: object) => void,
   *   emitAudio: (pcm: Buffer) => void,
   *   log?: Pick<Console, "warn">,
   *   maxReconnects?: number,
   *   connectTimeoutMs?: number,
   * }} opts
   */
  constructor({
    connectLive,
    buildConfig,
    tools,
    recorder,
    sessionsDir,
    kickoff,
    emit,
    emitAudio,
    log = console,
    maxReconnects = 3,
    connectTimeoutMs = 20000,
  }) {
    Object.assign(this, {
      connectLive,
      buildConfig,
      tools,
      recorder,
      sessionsDir,
      kickoff,
      emit,
      emitAudio,
      log,
      maxReconnects,
      connectTimeoutMs,
    });
    this.stoppedSignal = new Promise((resolve) => {
      this.markStopped = resolve;
    });
    this.live = null;
    this.handle = undefined;
    this.generation = 0;
    this.reconnects = 0;
    this.reconnecting = false;
    this.stopping = false;
    this.announcedReady = false;
    this.result = null;
  }

  /**
   * Resolves once connected — or quietly if the session is stopped first. The
   * SDK's connect() neither resolves nor rejects when setup fails (e.g. a bad
   * key only produces onclose), so a stop or a timeout must also end the wait.
   */
  async start() {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timed out connecting to the Live API")), this.connectTimeoutMs);
    });
    try {
      await Promise.race([this.#connect(), this.stoppedSignal, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** @param {Buffer} pcm 16 kHz mono PCM16 */
  sendAudio(pcm) {
    if (!this.live || this.stopping) return;
    try {
      this.live.sendRealtimeInput({
        audio: { data: pcm.toString("base64"), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
      });
    } catch (err) {
      this.log.warn(`[voice] dropped audio frame: ${err instanceof Error ? err.message : err}`);
    }
  }

  /** Typed message instead of speech. @param {string} text */
  sendText(text) {
    const t = String(text || "").trim();
    if (!t || !this.live || this.stopping) return;
    this.recorder.addText("user", t);
    this.recorder.flush("user");
    this.live.sendRealtimeInput({ text: t });
  }

  async stop(reason = "stopped") {
    if (this.stopping) return this.result;
    this.stopping = true;
    this.markStopped();
    this.generation += 1; // late callbacks from the old connection are ignored
    const live = this.live;
    this.live = null;
    try {
      live?.sendRealtimeInput({ audioStreamEnd: true });
    } catch {
      /* socket already gone */
    }
    try {
      live?.close();
    } catch {
      /* already closed */
    }
    this.recorder.flushAll();
    const hasContent = this.recorder.entries.length > 0;
    const file = hasContent ? this.recorder.save(this.sessionsDir, { endedAt: new Date() }) : null;
    this.result = { file, captures: this.recorder.captures, reason };
    this.emit({ type: "closed", ...this.result });
    return this.result;
  }

  async #connect() {
    const gen = (this.generation += 1);
    let setupDone = false;
    let liveReady = false;
    const maybeReady = () => {
      if (setupDone && liveReady && gen === this.generation) this.#onReady();
    };
    const callbacks = {
      onmessage: (msg) => {
        if (gen !== this.generation) return;
        if (msg.setupComplete) {
          setupDone = true;
          maybeReady();
        }
        this.#onMessage(msg);
      },
      onerror: (e) => {
        if (gen === this.generation) this.emit({ type: "error", message: describeError(e?.error || e?.message || e) });
      },
      onclose: (e) => {
        if (gen === this.generation) void this.#onClose(e);
      },
    };
    const live = await this.connectLive({ config: this.buildConfig({ handle: this.handle }), callbacks });
    if (gen !== this.generation) {
      // stop() or a newer reconnect superseded this attempt while connecting
      try {
        live.close();
      } catch {
        /* ignore */
      }
      return;
    }
    this.live = live;
    liveReady = true;
    maybeReady();
  }

  #onReady() {
    if (this.announcedReady) {
      this.emit({ type: "resumed" });
      return;
    }
    this.announcedReady = true;
    this.emit({ type: "ready" });
    this.live.sendRealtimeInput({ text: this.kickoff });
  }

  #onMessage(msg) {
    const sc = msg.serverContent;
    if (sc) {
      if (sc.interrupted) {
        this.recorder.flush("model");
        this.emit({ type: "interrupted" });
      }
      const heard = sc.inputTranscription?.text;
      if (heard) {
        this.recorder.addText("user", heard);
        this.emit({ type: "transcript", role: "user", text: heard });
      }
      const said = sc.outputTranscription?.text;
      if (said) {
        this.recorder.addText("model", said);
        this.emit({ type: "transcript", role: "model", text: said });
      }
      for (const part of sc.modelTurn?.parts ?? []) {
        if (part.inlineData?.data) this.emitAudio(Buffer.from(part.inlineData.data, "base64"));
      }
      if (sc.turnComplete) {
        this.recorder.flushAll();
        try {
          this.recorder.save(this.sessionsDir);
        } catch (err) {
          this.log.warn(`[voice] transcript save failed: ${err instanceof Error ? err.message : err}`);
        }
        this.emit({ type: "turnComplete" });
      }
    }
    if (msg.toolCall?.functionCalls?.length) {
      this.#runTools(msg.toolCall.functionCalls).catch((err) =>
        this.emit({ type: "error", message: describeError(err) }),
      );
    }
    const upd = msg.sessionResumptionUpdate;
    if (upd?.resumable && upd.newHandle) this.handle = upd.newHandle;
    if (msg.goAway) {
      this.emit({ type: "goAway", timeLeft: msg.goAway.timeLeft });
      void this.#reconnect("goAway");
    }
  }

  async #runTools(calls) {
    const functionResponses = [];
    for (const call of calls) {
      const args = call.args ?? {};
      const result = await this.tools.handle(call.name, args);
      this.recorder.addEvent(summarizeTool(call.name, args, result), { capture: Boolean(result?.ok) });
      this.emit({ type: "tool", name: call.name, args, result });
      functionResponses.push({ id: call.id, name: call.name, response: result });
    }
    // The connection may have been swapped or closed while tools ran.
    this.live?.sendToolResponse({ functionResponses });
  }

  async #onClose(e) {
    if (this.stopping) return;
    const why = e?.reason || (e?.code ? `code ${e.code}` : "closed");
    if (this.handle && this.reconnects < this.maxReconnects) {
      await this.#reconnect(`closed (${why})`);
      return;
    }
    this.emit({ type: "error", message: describeError(`Live connection closed: ${why}`) });
    await this.stop("connection closed");
  }

  async #reconnect(reason) {
    if (this.stopping || this.reconnecting) return;
    if (!this.handle || this.reconnects >= this.maxReconnects) {
      this.log.warn(`[voice] cannot resume after ${reason} (handle=${Boolean(this.handle)}, tries=${this.reconnects})`);
      return;
    }
    this.reconnecting = true;
    this.reconnects += 1;
    this.emit({ type: "reconnecting", reason });
    const old = this.live;
    try {
      await this.#connect(); // bumps generation first, so `old`'s callbacks are already stale
      try {
        old?.close();
      } catch {
        /* ignore */
      }
    } catch (err) {
      this.emit({ type: "error", message: describeError(err) });
      await this.stop("reconnect failed");
    } finally {
      this.reconnecting = false;
    }
  }
}
