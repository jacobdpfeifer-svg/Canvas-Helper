// Types for the dependency-free Blot core (index.js). Keep in step with the JS.

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "done" | "error";

export interface BlotItem {
  title: string;
  /** Canvas course colour (users/self/colors), e.g. "#e1ad49". */
  color?: string;
}

export interface BlotInput {
  state?: VoiceState | string;
  /** Smoothed loudness 0..1 (mic while listening, playback while speaking). */
  level?: number;
  items?: BlotItem[];
  /** Override where the eyes look, in body units. */
  gaze?: [number, number];
}

export interface BlotPose {
  sx: number;
  sy: number;
  tilt: number;
  bend: number;
  sag: number;
  shrink: number;
  nib: boolean;
}

export interface BlotEvent {
  kind: "land" | "stretch" | "poke" | "pinch" | "stamp";
  strength?: number;
}

export interface BlotFrame {
  state: VoiceState;
  label: VoiceState | "dozing";
  stateT: number;
  pose: BlotPose;
  hop: number;
  face: {
    eyes: "open" | "happy" | "closed";
    mouth: "smile" | "o" | "talk" | "flat" | "none";
    big: number;
    open: number;
    blink: number;
    gaze: [number, number];
  };
  bands: { color: string; amount: number }[];
  events: BlotEvent[];
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  index: number;
  launchAt: number;
  landAt: number;
  writeStart: number;
  writeEnd: number;
  chars: number;
}

export interface BlotColors {
  ink: string;
  shadow?: string;
}

export interface Blot {
  update(input: BlotInput, dt: number, opts?: { still?: boolean }): BlotFrame;
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, colors: BlotColors, opts?: { still?: boolean }): void;
  poke(strength?: number): void;
  readonly frame: BlotFrame;
  readonly points: Float64Array;
}

export function createBlot(opts?: { seed?: number }): Blot;

export interface Body {
  points: Float64Array;
  step(dt: number, pose: Partial<BlotPose>): void;
  snap(pose: Partial<BlotPose>): void;
  impulse(kind: "land" | "stretch" | "poke" | "pinch", strength?: number): void;
  area(): number;
}
export function createBody(pose?: Partial<BlotPose>): Body;
export function targetOutline(pose?: Partial<BlotPose>, n?: number): Float64Array;
export function areaOf(xy: ArrayLike<number>): number;
export const POINTS: number;
export const NIB_INDEX: number;

export interface Machine {
  update(input: BlotInput, dt: number, opts?: { still?: boolean }): BlotFrame;
  poke(strength?: number): void;
  readonly state: VoiceState;
}
export function createMachine(opts?: { seed?: number }): Machine;
export function seededRandom(seed?: number): () => number;
export const STATES: VoiceState[];

export interface LevelMeter {
  push(rms: number, dt: number): number;
  readonly level: number;
  reset(): void;
}
export function createLevelMeter(opts?: { attack?: number; release?: number; gate?: number; gain?: number }): LevelMeter;
export function rmsOf(buffer: ArrayLike<number>): number;

export function answerTimeline(items: { title: string }[]): TimelineEntry[];
export function charsWritten(entry: TimelineEntry | undefined, t: number): number;
export const DROP_FLIGHT: number;
export const PINCH: number;

export function layout(width: number, height: number): { R: number; x: number; floor: number };
export function faceFrame(points: ArrayLike<number>): { cx: number; cy: number; hw: number; hh: number };
export function drawBlot(
  ctx: CanvasRenderingContext2D,
  points: Float64Array,
  frame: BlotFrame,
  place: { x: number; floor: number; R: number; ink: string; shadow?: string },
): void;
export function drawStamp(
  ctx: CanvasRenderingContext2D,
  opts: { x: number; floor: number; R: number; color: string; alpha: number; seed?: number },
): void;

export const POSES: Record<string, Record<string, unknown>>;
export const DOZE_AFTER: number;
