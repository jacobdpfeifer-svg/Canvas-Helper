export type PlanDay = {
  date: string;
  label: string;
  isToday: boolean;
  topics: string[];
  mode: "study" | "review";
};

export type ExamPlan = {
  examId: string;
  examTitle: string;
  courseLabel: string;
  days: PlanDay[];
  seed: number;
  draft: true;
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function hashSeed(s: string, extra: number): number {
  let h = extra + 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Deterministic draft plan. A model-backed planner can replace this later. */
export function buildExamPlan(
  exam: { id: string; title: string; due_at: string | null; course_label?: string; description?: string },
  sources: { title: string; text?: string; kind?: string }[],
  today: Date,
  seed = 1
): ExamPlan {
  const due = exam.due_at ? new Date(exam.due_at) : addDays(today, 7);
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const end = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()));
  const span = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const topics = sources
    .map((s) => s.title)
    .filter(Boolean)
    .concat(exam.description ? [exam.description.slice(0, 80)] : []);
  const unique = [...new Set(topics.length ? topics : ["Course notes"])];
  const weighted = shuffle(unique, hashSeed(exam.id, seed));
  const days: PlanDay[] = [];
  for (let i = 0; i <= span; i++) {
    const date = addDays(start, i);
    const isLast = i === span;
    const topic = weighted[i % weighted.length];
    const later = weighted[weighted.length - 1 - (i % weighted.length)];
    days.push({
      date: dayKey(date),
      label: date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
      isToday: i === 0,
      topics: isLast ? ["Review everything on this draft"] : [later || topic, topic].filter((t, idx, arr) => arr.indexOf(t) === idx),
      mode: isLast ? "review" : "study",
    });
  }
  return {
    examId: exam.id,
    examTitle: exam.title,
    courseLabel: exam.course_label || "",
    days,
    seed,
    draft: true,
  };
}
