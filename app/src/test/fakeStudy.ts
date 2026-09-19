/**
 * In-memory stand-in for the Python study core, driven through the same
 * `transport.send(cmd, params)` seam the app uses. It models just enough of
 * the contract (CONTRACTS C-02) for interaction tests: offer → start → draft →
 * submit → feedback, hints/reveal/skip, and error envelopes.
 */
import type { Envelope } from "../study/types";

type Params = Record<string, unknown>;

export function makeFakeStudy(options: { failWith?: { cmd: string; code: string; message: string } } = {}) {
  const calls: { cmd: string; params: Params }[] = [];
  let attemptCounter = 0;
  let attempt: Record<string, unknown> | null = null;
  const item = {
    id: "Q-1",
    packet_id: "Q",
    packet_version: 1,
    course: "MATH 1300 (synthetic)",
    objective_id: "chain-rule",
    objective_label: "Apply the chain rule to a power of a function",
    kind: "procedural",
    stem: "Differentiate y = (sin x)^4. Name the inner function and enter the derivative.",
    neutral_locator: "Q §chain",
    fields: [
      { id: "inner", label: "Inner function", kind: "text", options: [], scored: true },
      { id: "derivative", label: "Derivative y′", kind: "text", options: [], scored: true },
    ],
    has_example: true,
    has_hint: true,
    modes: ["review", "learn", "practice"],
    predicted_seconds: 180,
    provenance: "synthetic",
    state: null,
  };
  const timeline = [
    { label: "Objective + locator", seconds: 20 },
    { label: "Attempt", seconds: 150 },
    { label: "Feedback + source", seconds: 70 },
    { label: "Optional repair", seconds: 40 },
    { label: "Close", seconds: 20 },
  ];

  async function send(cmd: string, params: Params): Promise<Envelope<Record<string, unknown>>> {
    calls.push({ cmd, params });
    if (options.failWith && options.failWith.cmd === cmd) {
      return { ok: false, error: { code: options.failWith.code, message: options.failWith.message } };
    }
    switch (cmd) {
      case "status":
        return { ok: true, courses: ["MATH 1300 (synthetic)"], packets: [], exams: [], items: { active: 1, due_now: 0, next_due: null, stability: {} }, log: { events: 3, partial_tail: false }, clock: { status: "trusted", note: "", anomalies: 0 }, open_attempts: [], pending_assessments: [], now: "", zone: "UTC" };
      case "offer":
        return {
          ok: true,
          kind: "offer",
          item,
          mode: params.mode ?? "review",
          why: "One question on “Apply the chain rule to a power of a function”, backed by Q §chain. A first answer sets a baseline.",
          next_at: null,
          reason: "",
          action: "",
          state: null,
          eligibility_note: "First encounter: this answer sets a baseline.",
          alternatives: [],
          minutes: params.minutes,
          timeline,
          resume: attempt && attempt.status === "open" ? attempt : null,
          session: { id: "s", visited: [] },
        };
      case "start": {
        if (attempt && attempt.status === "open") {
          return { ok: true, resumed: true, attempt, item, timeline };
        }
        attemptCounter += 1;
        attempt = {
          attempt_id: `a${attemptCounter}`,
          item_id: "Q-1",
          objective_id: "chain-rule",
          mode: params.mode,
          started_at: new Date().toISOString(),
          clock_status: "trusted",
          status: "open",
          draft: "",
          draft_revision: 0,
          draft_saved_at: null,
          response: "",
          fields: {},
          submitted_at: null,
          hints: 0,
          exposures: params.mode === "learn" ? [{ kind: "example", solution_bearing: "yes", at: "" }] : [],
          assistance: "none",
          outcome: null,
          grader: null,
          scope: null,
          evidence: null,
          revealed: false,
        };
        const example = params.mode === "learn" ? { example: { title: "Worked example", text: "y = (3x² + 1)^5 gives 5(3x² + 1)^4 · 6x." } } : {};
        return { ok: true, resumed: false, attempt, item, timeline, ...example };
      }
      case "draft":
        if (attempt) {
          attempt.draft = params.text;
          attempt.draft_revision = Number(attempt.draft_revision) + 1;
          attempt.draft_saved_at = new Date().toISOString();
        }
        return { ok: true, revision: attempt?.draft_revision ?? 1, saved_at: attempt?.draft_saved_at ?? null };
      case "hint":
        if (attempt) attempt.hints = Number(attempt.hints) + 1;
        return { ok: true, hint: "The inside of the power is sin x.", attempt };
      case "reveal":
        if (attempt) attempt.revealed = true;
        return { ok: true, sources: [{ id: "Q", locator: "Q §chain", text: "For y = f(g(x)), y′ = f′(g(x)) · g′(x).", hash: "sha256:x" }], key: { inner: "sin x", derivative: "4 sin³(x) cos(x)", explanation: "Outer power rule then cos x.", support_refs: ["Q §chain"], provenance_label: "synthetic template derivation" }, attempt };
      case "skip":
        if (attempt) attempt.status = "assessed";
        return { ok: true, attempt, state: {} };
      case "submit": {
        const fields = (params.fields ?? {}) as Record<string, string>;
        const innerOk = /sin\s*\(?x\)?/i.test(fields.inner ?? "");
        const derivOk = /cos/i.test(fields.derivative ?? "");
        const outcome = innerOk && derivOk ? "correct" : innerOk || derivOk ? "partial" : "incorrect";
        const evidence = attempt?.mode === "learn" ? "acquisition_only" : attempt?.revealed ? "exposed_response" : Number(attempt?.hints) > 0 ? "assisted_response" : "baseline_response";
        if (attempt) {
          attempt.status = "assessed";
          attempt.outcome = outcome;
          attempt.evidence = evidence;
          attempt.fields = fields;
        }
        return {
          ok: true,
          duplicate: false,
          attempt,
          assessment: { outcome, grader: "deterministic", scope: "Inner function; Derivative y′", evidence, copy: "First answer in this app: a baseline, not evidence of retention.", checker: { fields: [{ field_id: "inner", label: "Inner function", passed: innerOk, scored: true, note: "" }, { field_id: "derivative", label: "Derivative y′", passed: derivOk, scored: true, note: "" }] } },
          feedback: outcome === "partial" ? "Multiply by the derivative of the inside: cos x." : "",
          key: { inner: "sin x", derivative: "4 sin³(x) cos(x)", explanation: "Outer power rule gives 4(sin x)^3; multiply by cos x.", support_refs: ["Q §chain"], provenance_label: "synthetic template derivation" },
          sources: [{ id: "Q", locator: "Q §chain", text: "For y = f(g(x)), y′ = f′(g(x)) · g′(x).", hash: "sha256:x" }],
          state: { item_id: "Q-1", objective_id: "chain-rule", due: "2026-09-19T15:00:00+00:00", anchor: null, gap_days: 1, hits: 0, stability: "fragile", cooldown: null, validity: "active", schedule_status: "scheduled", encountered: true, last_evidence: evidence, last_outcome: outcome, effective_due: "2026-09-19T15:00:00+00:00", independent_check_no_earlier_than: "2026-09-19T15:00:00+00:00" },
          next: { due: "2026-09-19T15:00:00+00:00", independent_after: "2026-09-19T15:00:00+00:00", lines: [] },
        };
      }
      case "report-help":
        return { ok: true, attempt: { ...attempt, evidence: "unknown_assistance", assistance: "unknown" }, state: { stability: "fragile", hits: 0, schedule_status: "scheduled", effective_due: null, independent_check_no_earlier_than: null } };
      case "disagree":
        return { ok: true, attempt: { ...attempt, evidence: "no_evidence", outcome: "uncertain" }, state: { stability: "fragile", hits: 0, schedule_status: "scheduled", effective_due: null, independent_check_no_earlier_than: null } };
      default:
        return { ok: false, error: { code: "validation", message: `fake has no ${cmd}` } };
    }
  }
  return { send, calls };
}
