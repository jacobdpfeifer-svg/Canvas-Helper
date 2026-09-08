import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type Top3Item = { id: string; title: string; due: string };

export type SyncResult = { ok: boolean; error?: string | null };

export type RouteResult = {
  skill_id: string | null;
  method: string;
  ambiguous: boolean;
  model_tier: string | null;
  raw: string;
};

export type DockMode = "onboarding" | "peek" | "expanded";

/** Native dock commands share this adapter with all other frontend IPC. */
export async function setDockMode(mode: DockMode): Promise<void> {
  if (!isTauri()) return;
  await invoke("set_dock_mode", { mode });
}

export async function showDock(): Promise<void> {
  if (!isTauri()) return;
  await invoke("show_dock");
}

export async function hideDock(): Promise<void> {
  if (!isTauri()) return;
  await invoke("hide_dock");
}

/** True when running inside the Tauri webview (not plain Vite browser). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function syncCanvas(): Promise<SyncResult> {
  if (!isTauri()) return { ok: false, error: "not in tauri" };
  return invoke<SyncResult>("sync_canvas");
}

export async function readTop3(): Promise<Top3Item[]> {
  if (!isTauri()) return [];
  return invoke<Top3Item[]>("read_top3");
}

export async function openCanvasSso(): Promise<void> {
  if (!isTauri()) return;
  await invoke("open_canvas_sso");
}

export async function saveOnboarding(
  schoolSlug: string,
  cloudKey: string
): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem("pn_school", schoolSlug);
    localStorage.setItem("pn_cloud_key", cloudKey);
    return;
  }
  await invoke("save_onboarding", {
    schoolSlug,
    cloudKey,
  });
}

export type LearningProfileAnswers = {
  practiceFormat: "worked_example" | "retrieval";
  autonomy: "directive" | "choices";
  chunkSize: "short" | "long";
  checkDepth: "light" | "thorough";
};

export async function saveLearningProfile(
  answers: LearningProfileAnswers
): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem("pn_learning_profile", JSON.stringify(answers));
    return;
  }
  await invoke("save_learning_profile", {
    practiceFormat: answers.practiceFormat,
    autonomy: answers.autonomy,
    chunkSize: answers.chunkSize,
    checkDepth: answers.checkDepth,
  });
}

export async function routeIntent(trigger: string): Promise<RouteResult | null> {
  if (!isTauri()) return null;
  return invoke<RouteResult>("route_intent", { trigger });
}

export async function onInboxUpdated(
  handler: () => void
): Promise<UnlistenFn | (() => void)> {
  if (!isTauri()) return () => undefined;
  return listen("inbox-updated", () => handler());
}
