// GENERATED from app/src/blot/core/index.js by tools/vendor-shared.mjs — edit the source, not this copy.
/**
 * Blot core: dependency-free, shared by the Tauri app (app/src/blot) and the
 * Chrome extension side panel (vendored to app/extension-chrome/shared/blot).
 * Plan: docs/design/blot-animation-plan-2026-09-30.md
 */
export { createBlot } from "./engine.js";
export { createBody, targetOutline, areaOf, POINTS, NIB_INDEX } from "./body.js";
export { createMachine, seededRandom, STATES } from "./machine.js";
export { createLevelMeter, rmsOf } from "./level.js";
export { answerTimeline, charsWritten, DROP_FLIGHT, PINCH } from "./timeline.js";
export { drawBlot, drawStamp, layout, faceFrame } from "./render.js";
export { POSES, DOZE_AFTER } from "./poses.js";
