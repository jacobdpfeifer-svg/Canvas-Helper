/**
 * The only module that touches @google/genai. Everything else takes an injected
 * `connectLive`, so the bridge and server are testable without a key or network.
 */
import { EndSensitivity, GoogleGenAI, Modality } from "@google/genai";

/**
 * @param {{ systemInstruction: string, tools: unknown[], voiceName?: string, silenceMs: number, handle?: string }} opts
 */
export function buildLiveConfig({ systemInstruction, tools, voiceName, silenceMs, handle }) {
  return {
    responseModalities: [Modality.AUDIO],
    systemInstruction,
    tools,
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      // Gemini Live defaults to cutting turns quickly; reflective talk needs room to pause.
      automaticActivityDetection: {
        endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
        silenceDurationMs: silenceMs,
      },
    },
    // Long interviews outlast the default audio session cap: compress context and allow resume.
    contextWindowCompression: { slidingWindow: {} },
    sessionResumption: handle ? { handle } : {},
    ...(voiceName ? { speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } } : {}),
  };
}

/** @param {{ apiKey: string, model: string }} opts */
export function createLiveConnector({ apiKey, model }) {
  const ai = new GoogleGenAI({ apiKey });
  return ({ config, callbacks }) => ai.live.connect({ model, config, callbacks });
}

/**
 * Models this key can use for Live (bidiGenerateContent).
 * @param {string} apiKey
 * @returns {Promise<Array<{ name: string, displayName: string }>>}
 */
export async function listLiveModels(apiKey) {
  const ai = new GoogleGenAI({ apiKey });
  const out = [];
  const pager = await ai.models.list({ config: { pageSize: 100 } });
  for await (const m of pager) {
    if ((m.supportedActions || []).includes("bidiGenerateContent")) {
      out.push({ name: String(m.name || "").replace(/^models\//, ""), displayName: m.displayName || "" });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
