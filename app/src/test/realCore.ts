/**
 * Drive the actual Python study core from Vitest (idea adopted from candidate
 * B's core-contract test): each transport call spawns the isolated `study`
 * package exactly as the desktop app does (cwd = src/canvas_mcp/core, `-s`,
 * `--user-root`, JSON on stdin). Skips when no interpreter is available.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Envelope } from "../study/types";

const REPO = resolve(__dirname, "../../..");
const CORE_DIR = join(REPO, "src", "canvas_mcp", "core");

export function pythonPath(): string | null {
  for (const candidate of [process.env.PRODUCTNAME_TEST_PYTHON, join(REPO, ".venv", "bin", "python"), "/usr/bin/python3"]) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
}

export function makeRealCore(python: string) {
  const root = mkdtempSync(join(tmpdir(), "pn-real-core-"));
  const send = async (cmd: string, params: Record<string, unknown>): Promise<Envelope<Record<string, unknown>>> => {
    const child = spawnSync(python, ["-s", "-m", "study", "--user-root", root, "--zone", "America/Denver", "--json", "run"], {
      cwd: CORE_DIR,
      input: JSON.stringify({ cmd, params }),
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "", PRODUCTNAME_TEMPLATES_DIR: join(REPO, "templates", "study-packets"), PYTHONDONTWRITEBYTECODE: "1" },
    });
    const line = (child.stdout || "").trim().split("\n").reverse().find((l) => l.trim().startsWith("{"));
    if (!line) throw new Error(`no reply (exit ${child.status})`);
    return JSON.parse(line) as Envelope<Record<string, unknown>>;
  };
  return { root, send, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
