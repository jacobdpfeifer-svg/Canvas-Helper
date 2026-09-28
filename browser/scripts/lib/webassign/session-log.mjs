/**
 * Session artifacts under inbox/courses/_raw/webassign-*.json
 */
import fs from "node:fs";
import path from "node:path";
import { COURSES_RAW_DIR } from "../canvas-session.mjs";

export function webassignLogPath(slug = "run") {
  const safe = String(slug).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(COURSES_RAW_DIR, `webassign-${safe}-${stamp}.json`);
}

export function createSessionLog(slug) {
  const file = webassignLogPath(slug);
  const state = {
    startedAt: new Date().toISOString(),
    events: [],
    questions: [],
    result: null,
  };

  function flush() {
    fs.mkdirSync(COURSES_RAW_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  }

  return {
    file,
    event(type, data = {}) {
      state.events.push({ at: new Date().toISOString(), type, ...data });
      flush();
    },
    question(entry) {
      state.questions.push({ at: new Date().toISOString(), ...entry });
      flush();
    },
    finish(result) {
      state.result = result;
      state.finishedAt = new Date().toISOString();
      flush();
      return file;
    },
  };
}
