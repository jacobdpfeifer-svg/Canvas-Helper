/**
 * Loudness → a calm 0..1 level. Raw RMS twitches frame to frame, which reads
 * as broken, so the meter gates silence and rises faster than it falls.
 */

/** Root-mean-square of a time-domain buffer (AnalyserNode.getFloatTimeDomainData). */
export function rmsOf(buffer) {
  if (!buffer || !buffer.length) return 0;
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

/**
 * @param {{ attack?: number, release?: number, gate?: number, gain?: number }} [opts]
 *   attack/release are time constants in seconds; gate is the RMS below which input counts as silence.
 */
export function createLevelMeter({ attack = 0.03, release = 0.15, gate = 0.012, gain = 4.5 } = {}) {
  let level = 0;
  return {
    /** Feed one RMS reading taken dt seconds after the last; returns the smoothed level. */
    push(rms, dt) {
      const raw = rms < gate ? 0 : Math.min(1, (rms - gate) * gain);
      const tau = raw > level ? attack : release;
      const k = 1 - Math.exp(-Math.max(dt, 0) / tau);
      level += (raw - level) * k;
      if (level < 1e-4) level = 0;
      return level;
    },
    get level() {
      return level;
    },
    reset() {
      level = 0;
    },
  };
}
