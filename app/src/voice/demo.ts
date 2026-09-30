/**
 * A scripted voice exchange that drives voicePresence with a synthetic level,
 * for development and screenshots before the voice model is wired in.
 * Dev builds only: open the app with ?blot (see App.tsx).
 */
import { voicePresence, type VoiceItem, type VoicePresence } from "./presence";

const ITEMS: VoiceItem[] = [
  { title: "CSCI 2270 lab 4", due: "Thu 11:59 pm", color: "#e1ad49" },
  { title: "PHYS 1110 problem set 5", due: "Fri 9:00 am", color: "#ff604d" },
];

type Step = [number, Partial<VoicePresence>];

const SCRIPT: Step[] = [
  [1.2, { state: "idle" }],
  [3.2, { state: "listening", transcript: "What do I actually need to finish before Friday?" }],
  [2.0, { state: "thinking", status: "Checking your week in CSCI 2270 and PHYS 1110" }],
  [
    5.6,
    {
      state: "speaking",
      reply: "Two things. The CSCI 2270 lab is due Thursday at 11:59 p.m., and the PHYS 1110 problem set is due Friday at 9 a.m.",
      items: ITEMS,
    },
  ],
  [2.4, { state: "done" }],
  [10, { state: "idle" }],
];

/** Speech-like loudness: syllables inside phrases, with pauses. */
export function synthLevel(t: number, user: boolean): number {
  const phrase = Math.sin(t * 1.3) + Math.sin(t * 0.77 + 2) > -0.7 ? 1 : 0.04;
  const syl = Math.abs(Math.sin(t * 8.7)) * 0.55 + Math.abs(Math.sin(t * 13.1 + 1.3)) * 0.3 + (Math.sin(t * 3.1) * 0.5 + 0.5) * 0.25;
  return Math.min(1, syl * phrase * (user ? 0.8 : 1));
}

export function runVoiceDemo({ loop = true } = {}): () => void {
  let raf = 0;
  let step = 0;
  let stepAt = performance.now();
  let stopped = false;
  voicePresence.onStop(() => {
    stopped = true;
  });
  voicePresence.set(SCRIPT[0][1]);
  const tick = (now: number) => {
    if (stopped) return;
    if ((now - stepAt) / 1000 > SCRIPT[step][0]) {
      step += 1;
      if (step >= SCRIPT.length) {
        if (!loop) return;
        step = 0;
      }
      stepAt = now;
      voicePresence.set(SCRIPT[step][1]);
    }
    const s = voicePresence.get().state;
    const t = now / 1000;
    voicePresence.setLevel(s === "listening" ? synthLevel(t, true) : s === "speaking" ? synthLevel(t + 5, false) : 0);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    voicePresence.onStop(null);
    voicePresence.reset();
  };
}
