/**
 * Diff engine + Composio Google Calendar API apply for school schedule sync.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MANIFEST_PATH,
  POLICY_PATH,
  readManifest,
  readPolicyCalendarId,
  writePolicyCalendarId,
} from "./calendar-manifest.mjs";

export const STATE_PATH = path.join(
  path.dirname(MANIFEST_PATH),
  "courses",
  "_raw",
  "google-calendar-sync-state.json"
);

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Load repo-root `.env` into process.env (does not override existing vars). */
export function loadRepoEnv() {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadRepoEnv();

const COMPOSIO_BASE = process.env.COMPOSIO_BASE || "https://backend.composio.dev/api/v3";
const KIND_COLORS = { class: "9", exam: "11", presentation: "5", club: "10", manual: "7" };

export function eventToGoogleBody(event) {
  const body = {
    summary: event.summary,
    description: [
      event.description || "",
      event.url ? `Canvas: ${event.url}` : "",
      `cu_id: ${event.id}`,
      `source: ${event.source}`,
      `confidence: ${event.confidence || "confirmed"}`,
    ]
      .filter(Boolean)
      .join("\n"),
    location: event.location || undefined,
    start: {
      dateTime: event.start,
      timeZone: event.timezone || "America/Denver",
    },
    end: {
      dateTime: event.end,
      timeZone: event.timezone || "America/Denver",
    },
    extendedProperties: {
      private: {
        cu_id: event.id,
        cu_source: event.source,
        cu_kind: event.kind,
      },
    },
    colorId: KIND_COLORS[event.kind] || "9",
    transparency: event.kind === "class" ? "opaque" : "opaque",
  };
  if (event.recurrence?.length) {
    body.recurrence = event.recurrence;
  }
  return body;
}

export function fingerprint(event) {
  return JSON.stringify({
    id: event.id,
    summary: event.summary,
    start: event.start,
    end: event.end,
    location: event.location || "",
    recurrence: event.recurrence || [],
  });
}

export function loadSyncState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    }
  } catch {
    /* fresh state */
  }
  return { mappings: {}, lastHash: null, lastSync: null };
}

export function saveSyncState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

export function diffManifest(manifest, state = loadSyncState()) {
  const creates = [];
  const updates = [];
  const skips = [];

  for (const event of manifest.events || []) {
    const mapped = state.mappings?.[event.id];
    const fp = fingerprint(event);
    if (!mapped?.googleEventId) {
      creates.push(event);
    } else if (mapped.fingerprint !== fp) {
      updates.push({ event, googleEventId: mapped.googleEventId });
    } else {
      skips.push(event);
    }
  }

  return { creates, updates, skips, state };
}

function requireComposioConfig() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "COMPOSIO_API_KEY not set. Connect Google Calendar via Composio MCP, or add COMPOSIO_API_KEY to .env for CLI --apply."
    );
  }
  const accountId =
    process.env.COMPOSIO_GOOGLE_CALENDAR_ACCOUNT_ID ||
    process.env.COMPOSIO_CONNECTED_ACCOUNT_ID;
  return { apiKey, accountId };
}

async function composioExecute(toolSlug, args, { apiKey, accountId } = {}) {
  const cfg = requireComposioConfig();
  const key = apiKey || cfg.apiKey;
  const connectedAccountId = accountId || cfg.accountId;

  const payload = { arguments: args };
  if (connectedAccountId) payload.connected_account_id = connectedAccountId;

  const res = await fetch(`${COMPOSIO_BASE}/tools/execute/${toolSlug}`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }

  if (!res.ok) {
    throw new Error(
      `Composio ${toolSlug} failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`
    );
  }
  return json;
}

function unwrapData(result) {
  return result?.data ?? result?.response_data ?? result;
}

export async function listGoogleCalendars() {
  const result = await composioExecute("GOOGLECALENDAR_LIST_CALENDARS", {
    max_results: 250,
  });
  const data = unwrapData(result);
  return data?.calendars || data?.items || [];
}

export async function findCalendarBySummary(summary) {
  const calendars = await listGoogleCalendars();
  return calendars.find(
    (c) =>
      String(c.summary || c.title || "").toLowerCase() === summary.toLowerCase() ||
      String(c.summaryOverride || "").toLowerCase() === summary.toLowerCase()
  );
}

export async function setupSubcalendar(name = "CU Fall 2026") {
  let cal = await findCalendarBySummary(name);
  if (!cal) {
    const created = await composioExecute("GOOGLECALENDAR_CREATE_CALENDAR", {
      summary: name,
      description: "CU Boulder Fall 2026 school schedule (Jacob IBE agent sync)",
      timezone: "America/Denver",
    });
    const data = unwrapData(created);
    cal = data?.calendar_data || data;
  }
  const calendarId = cal?.id || cal?.calendar_id;
  if (!calendarId) {
    throw new Error(`Could not resolve calendar_id after create/list for "${name}"`);
  }
  writePolicyCalendarId(calendarId);
  return calendarId;
}

export async function createGoogleEvent(calendarId, event) {
  const body = eventToGoogleBody(event);
  const result = await composioExecute("GOOGLECALENDAR_CREATE_EVENT", {
    calendar_id: calendarId,
    summary: event.summary,
    description: body.description,
    location: event.location || undefined,
    start_datetime: event.start,
    end_datetime: event.end,
    timezone: event.timezone || "America/Denver",
    recurrence: event.recurrence,
    color_id: body.colorId,
    extended_properties: body.extendedProperties,
  });
  const data = unwrapData(result);
  return data?.response_data?.id || data?.id;
}

export async function patchGoogleEvent(calendarId, googleEventId, event) {
  await composioExecute("GOOGLECALENDAR_PATCH_EVENT", {
    calendar_id: calendarId,
    event_id: googleEventId,
    summary: event.summary,
    description: eventToGoogleBody(event).description,
    location: event.location || undefined,
    start_time: event.start,
    end_time: event.end,
    timezone: event.timezone || "America/Denver",
    recurrence: event.recurrence,
    extended_properties: eventToGoogleBody(event).extendedProperties,
  });
  return googleEventId;
}

export async function batchSyncEvents(calendarId, { creates = [], updates = [] }) {
  if (!creates.length && !updates.length) return { results: [] };

  const operations = [
    ...creates.map((event, i) => ({
      op_id: `create_${i}_${event.id}`,
      method: "POST",
      calendar_id: calendarId,
      body: eventToGoogleBody(event),
    })),
    ...updates.map(({ event, googleEventId }, i) => ({
      op_id: `patch_${i}_${event.id}`,
      method: "PATCH",
      calendar_id: calendarId,
      event_id: googleEventId,
      body: eventToGoogleBody(event),
    })),
  ];

  const result = await composioExecute("GOOGLECALENDAR_BATCH_EVENTS", {
    operations,
    fail_fast: false,
  });
  return unwrapData(result);
}

export function formatDiffReport(diff, manifest) {
  const lines = [
    `# Calendar sync diff`,
    ``,
    `Manifest: ${MANIFEST_PATH}`,
    `Hash: ${manifest.hash}`,
    `Events in manifest: ${manifest.events?.length ?? 0}`,
    ``,
    `Create: ${diff.creates.length}`,
    `Update: ${diff.updates.length}`,
    `Skip (unchanged): ${diff.skips.length}`,
    ``,
  ];

  if (diff.creates.length) {
    lines.push(`## Create`);
    for (const e of diff.creates) {
      lines.push(`- ${e.id} | ${e.kind} | ${e.summary} | ${e.start} → ${e.end}`);
    }
    lines.push(``);
  }

  if (diff.updates.length) {
    lines.push(`## Update`);
    for (const { event, googleEventId } of diff.updates) {
      lines.push(`- ${event.id} (${googleEventId}) | ${event.summary}`);
    }
    lines.push(``);
  }

  if (manifest.gaps?.length) {
    lines.push(`## Gaps`);
    for (const g of manifest.gaps) {
      lines.push(`- ${g.course}: ${g.gap}`);
    }
  }

  return lines.join("\n");
}

export async function applyDiff(manifest, diff, calendarId) {
  const state = { ...diff.state, mappings: { ...(diff.state.mappings || {}) } };
  const batchResult = await batchSyncEvents(calendarId, diff);

  const results = batchResult?.results || [];
  let createIdx = 0;
  let updateIdx = 0;

  for (const op of results) {
    const status = op.http_status || op.status;
    const ok = status >= 200 && status < 300;
    if (!ok) continue;

    if (op.method === "POST" && diff.creates[createIdx]) {
      const event = diff.creates[createIdx];
      const eventId = op.body?.id || op.response?.id || op.data?.id;
      if (eventId) {
        state.mappings[event.id] = {
          googleEventId: eventId,
          fingerprint: fingerprint(event),
          updated: new Date().toISOString(),
        };
      }
      createIdx += 1;
    } else if (op.method === "PATCH" && diff.updates[updateIdx]) {
      const { event, googleEventId } = diff.updates[updateIdx];
      state.mappings[event.id] = {
        googleEventId,
        fingerprint: fingerprint(event),
        updated: new Date().toISOString(),
      };
      updateIdx += 1;
    }
  }

  // Fallback: create one-by-one if batch didn't return ids
  for (const event of diff.creates) {
    if (state.mappings[event.id]?.googleEventId) continue;
    try {
      const id = await createGoogleEvent(calendarId, event);
      if (id) {
        state.mappings[event.id] = {
          googleEventId: id,
          fingerprint: fingerprint(event),
          updated: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn(`Create fallback failed for ${event.id}: ${e.message}`);
    }
  }

  for (const { event, googleEventId } of diff.updates) {
    try {
      await patchGoogleEvent(calendarId, googleEventId, event);
      state.mappings[event.id] = {
        googleEventId,
        fingerprint: fingerprint(event),
        updated: new Date().toISOString(),
      };
    } catch (e) {
      console.warn(`Patch failed for ${event.id}: ${e.message}`);
    }
  }

  state.lastHash = manifest.hash;
  state.lastSync = new Date().toISOString();
  state.calendarId = calendarId;
  saveSyncState(state);
  return state;
}

export function readCalendarIdFromPolicy() {
  return readPolicyCalendarId();
}
