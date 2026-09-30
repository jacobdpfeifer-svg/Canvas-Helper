/**
 * In-memory stand-in for a Gemini Live connection (the `connectLive` seam).
 * Each connect() yields a connection you can drive with `emit(serverMessage)`.
 */

/**
 * @param {{ setupBeforeResolve?: boolean, failWith?: Error, delayMs?: number, hangAndClose?: { code: number, reason: string } }} [opts]
 *   setupBeforeResolve: deliver setupComplete before connect() resolves (the real SDK can flush queued messages first)
 *   delayMs: connect() resolves this long after being called (a slow connection)
 *   hangAndClose: connect() never settles and onclose fires instead — what the real SDK does on a bad API key
 */
export function createFakeLive({ setupBeforeResolve = false, failWith, delayMs = 0, hangAndClose } = {}) {
  /** @type {Array<ReturnType<typeof makeConnection>>} */
  const connections = [];

  function makeConnection(config, callbacks) {
    return {
      config,
      callbacks,
      sent: [],
      toolResponses: [],
      closed: false,
      sendRealtimeInput(p) {
        if (this.closed) throw new Error("socket closed");
        this.sent.push(p);
      },
      sendToolResponse(p) {
        this.toolResponses.push(p);
      },
      close() {
        this.closed = true;
      },
      emit(msg) {
        callbacks.onmessage(msg);
      },
    };
  }

  async function connectLive({ config, callbacks }) {
    if (failWith) throw failWith;
    if (hangAndClose) {
      setImmediate(() => callbacks.onclose(hangAndClose));
      return new Promise(() => {});
    }
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    const conn = makeConnection(config, callbacks);
    connections.push(conn);
    if (setupBeforeResolve) callbacks.onmessage({ setupComplete: {} });
    else setImmediate(() => callbacks.onmessage({ setupComplete: {} }));
    return conn;
  }

  return { connectLive, connections };
}

/** Let queued microtasks / setImmediate callbacks run. */
export async function settle(times = 5) {
  for (let i = 0; i < times; i++) await new Promise((r) => setImmediate(r));
}

/** @param {() => boolean} predicate @param {number} [ms] */
export async function waitFor(predicate, ms = 2000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > ms) throw new Error("waitFor timed out");
    await new Promise((r) => setTimeout(r, 10));
  }
}
